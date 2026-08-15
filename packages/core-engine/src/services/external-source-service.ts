import fs from "node:fs/promises";
import path from "node:path";
import type {
  DeploymentTargetId,
  ExternalSourceCommands,
  LeafRecord,
  LockFile,
  Result,
  SourceLockRecord,
  SourceManifestRecord,
  SourceUpdateDiff,
  SourceUpdateResultItem,
  Warning,
} from "@skill-flow/domain/types";
import { validateExternalSourceCommands } from "@skill-flow/domain/types";
import type { StateStore } from "@skill-flow/storage/state-store";
import { hashDirectory, isPathInside, pathExists, removePath } from "@skill-flow/integration/utils/fs";
import { fail, ok } from "@skill-flow/integration/utils/result";
import { deriveSourceId } from "@skill-flow/integration/utils/source-id";
import { getTargetScanRoots, TARGET_ORDER } from "@skill-flow/integration/utils/constants";
import { runExternalCommandChain } from "./external-command-executor.js";
import { parseSkillFrontmatter } from "./skill-frontmatter.js";

export type ExternalObservedPath = {
  target: DeploymentTargetId;
  rootPath: string;
  targetPath: string;
};

export type AddExternalSourceInput = {
  displayName: string;
  commands?: ExternalSourceCommands;
  presetToolName?: string;
  observedPaths: ExternalObservedPath[];
  sourceIdOverride?: string;
};

export type ExternalSourceSnapshot = {
  manifest: SourceManifestRecord;
  lock: SourceLockRecord;
  leafs: LeafRecord[];
  leafCount: number;
  invalidLeafCount: number;
};

export type ExternalSourceServiceOptions = {
  stateStore: StateStore;
};

const EXTERNAL_REJECTION_CODES = {
  pathNotFound: "EXTERNAL_PATH_NOT_FOUND",
  pathAlreadyManaged: "EXTERNAL_PATH_ALREADY_MANAGED",
  commandRequired: "EXTERNAL_COMMAND_REQUIRED",
  sourceExists: "SOURCE_EXISTS",
  invalidInput: "EXTERNAL_SOURCE_INVALID",
} as const;

/**
 * Registers externally managed sources (`watch` / `command`) that live outside
 * the skill-flow store. These sources never get a managed checkout: the lock
 * records the on-disk observed paths and their content hashes, and leafs point
 * at the real files so downstream reconcile/deployment stays read-only.
 */
export class ExternalSourceService {
  constructor(private readonly options: ExternalSourceServiceOptions) {}

  async addWatchSource(input: AddExternalSourceInput): Promise<Result<ExternalSourceSnapshot>> {
    try {
      validateExternalSourceCommands("watch", input.commands);
    } catch (error) {
      return fail({
        code: EXTERNAL_REJECTION_CODES.commandRequired,
        message: String(error instanceof Error ? error.message : error),
      });
    }
    return this.addExternalSource("watch", input);
  }

  async addCommandSource(input: AddExternalSourceInput): Promise<Result<ExternalSourceSnapshot>> {
    try {
      validateExternalSourceCommands("command", input.commands);
    } catch (error) {
      return fail({
        code: EXTERNAL_REJECTION_CODES.commandRequired,
        message: String(error instanceof Error ? error.message : error),
      });
    }
    return this.addExternalSource("command", input);
  }

  private async addExternalSource(
    kind: "watch" | "command",
    input: AddExternalSourceInput,
  ): Promise<Result<ExternalSourceSnapshot>> {
    if (input.observedPaths.length === 0 && kind === "watch") {
      return fail({
        code: EXTERNAL_REJECTION_CODES.invalidInput,
        message: "A watch skills group requires at least one observed path.",
      });
    }

    const state = await this.options.stateStore.readState();
    const managedCheckouts = new Set(
      Object.values(state.lockFile.sources).map((lock) => path.resolve(lock.localPath)),
    );
    const managedTargetPaths = new Set(
      state.lockFile.projections
        .filter((projection) => projection.status === "active")
        .map((projection) => path.resolve(projection.targetPath)),
    );

    const existingByPath = new Map(
      state.manifest.sources.map((source) => [path.resolve(source.locator), source.id] as const),
    );

    for (const observed of input.observedPaths) {
      const resolved = path.resolve(observed.targetPath);
      if (!(await pathExists(path.join(resolved, "SKILL.md")))) {
        return fail({
          code: EXTERNAL_REJECTION_CODES.pathNotFound,
          message: `No SKILL.md found at ${resolved}; watch and command groups register skills that already exist on disk.`,
        });
      }
      if (managedCheckouts.has(resolved) || managedTargetPaths.has(resolved)) {
        return fail({
          code: EXTERNAL_REJECTION_CODES.pathAlreadyManaged,
          message: `Path ${resolved} is already managed by skill-flow; use the existing import flow instead.`,
        });
      }
      const claimedBy = existingByPath.get(resolved);
      if (claimedBy) {
        return fail({
          code: EXTERNAL_REJECTION_CODES.sourceExists,
          message: `Path ${resolved} is already registered as skills group '${claimedBy}'.`,
        });
      }
      if (isPathInside(this.options.stateStore.rootPath, resolved)) {
        return fail({
          code: EXTERNAL_REJECTION_CODES.pathAlreadyManaged,
          message: `Path ${resolved} is inside the skill-flow store and cannot be registered as externally managed.`,
        });
      }
    }

    const primaryPath = input.observedPaths.length > 0
      ? path.resolve(input.observedPaths[0]!.targetPath)
      : "";
    const sourceId = input.sourceIdOverride
      ?? this.allocateSourceId(deriveSourceId(primaryPath || input.displayName), state);
    if (state.manifest.sources.some((source) => source.id === sourceId)) {
      return fail({
        code: EXTERNAL_REJECTION_CODES.sourceExists,
        message: `Skills group id '${sourceId}' is already registered.`,
      });
    }

    const leafs: LeafRecord[] = [];
    for (const observed of input.observedPaths) {
      const resolved = path.resolve(observed.targetPath);
      const leaf = await this.toLeafRecord(resolved, input.displayName);
      leafs.push({ ...leaf, sourceId, id: `${sourceId}:${path.basename(resolved)}` });
    }

    const now = new Date().toISOString();
    const contentHash = leafs.length > 0 ? await hashDirectory(leafs[0]!.absolutePath) : undefined;
    const source: SourceManifestRecord = {
      id: sourceId,
      kind,
      locator: primaryPath,
      canonicalLocator: primaryPath,
      displayName: input.displayName,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      ...(input.commands ? { externalCommands: input.commands } : {}),
      ...(input.presetToolName ? { presetToolName: input.presetToolName } : {}),
    };
    const lock: SourceLockRecord = {
      sourceId,
      canonicalLocator: primaryPath,
      revision: {
        provider: kind,
        ...(contentHash ? { contentHash } : {}),
        capturedAt: now,
      },
      localPath: primaryPath,
      leafIds: leafs.map((leaf) => leaf.id),
      observedTargets: input.observedPaths.map((observed) => ({
        target: observed.target,
        rootPath: observed.rootPath,
        targetPath: observed.targetPath,
      })),
      ...(input.commands ? { externalCommands: input.commands } : {}),
      ...(contentHash ? { contentHash } : {}),
      importMode: "explicit-add",
    };

    await this.options.stateStore.writeState({
      ...state,
      manifest: {
        ...state.manifest,
        sources: [...state.manifest.sources, source],
        bindings: {
          ...state.manifest.bindings,
          [sourceId]: {
            sourceId,
            selectionMode: "selected",
            selectedLeafIds: [],
            enabledTargets: [],
          },
        },
      },
      lockFile: {
        ...state.lockFile,
        sources: {
          ...state.lockFile.sources,
          [sourceId]: lock,
        },
        leafInventory: [...state.lockFile.leafInventory, ...leafs],
      } satisfies LockFile,
    });

    return ok({
      manifest: source,
      lock,
      leafs,
      leafCount: leafs.length,
      invalidLeafCount: 0,
    });
  }

  async installCommandSource(
    sourceId: string,
    options: { onStep: (step: string) => void },
  ): Promise<Result<ExternalSourceSnapshot>> {
    const state = await this.options.stateStore.readState();
    const source = state.manifest.sources.find((item) => item.id === sourceId);
    const lock = state.lockFile.sources[sourceId];
    if (!source || !lock) {
      return fail({
        code: "SOURCE_NOT_FOUND",
        message: `Skills group id '${sourceId}' is not registered.`,
      });
    }
    if (source.kind !== "command") {
      return fail({
        code: "EXTERNAL_SOURCE_INVALID",
        message: `Skills group '${sourceId}' is not a command group.`,
      });
    }

    const installCommand = source.externalCommands?.install?.trim();
    if (!installCommand) {
      return fail({
        code: "EXTERNAL_INSTALL_COMMAND_MISSING",
        message: `Skills group '${sourceId}' has no install command configured.`,
      });
    }

    const run = await runExternalCommandChain("install", {
      command: installCommand,
      onStep: options.onStep,
    });
    if (!run.ok) {
      return fail({
        code: run.errorCode ?? "EXTERNAL_COMMAND_FAILED",
        message: run.message ?? `The install command for '${sourceId}' failed.`,
      });
    }

    const observedPaths = await this.discoverObservedPaths(state, source.displayName, {
      excludeSourceId: sourceId,
    });
    const versionOutput = await this.runVersionCommand(source);
    return this.commitRediscoveredState(source, lock, state, observedPaths, versionOutput);
  }

  async unregisterExternalSources(sourceIds: string[]): Promise<Result<{ removed: string[] }>> {
    const removed: string[] = [];
    for (const sourceId of sourceIds) {
      const result = await this.unregisterExternalSource(sourceId);
      if (!result.ok) {
        return fail(result.errors, result.warnings);
      }
      removed.push(sourceId);
    }
    return ok({ removed });
  }

  async unregisterExternalSource(sourceId: string): Promise<Result<{ removed: string }>> {
    const state = await this.options.stateStore.readState();
    const source = state.manifest.sources.find((item) => item.id === sourceId);
    if (!source || !state.lockFile.sources[sourceId]) {
      return fail({
        code: "SOURCE_NOT_FOUND",
        message: `Skills group id '${sourceId}' is not registered.`,
      });
    }
    if (source.kind !== "watch" && source.kind !== "command") {
      return fail({
        code: "EXTERNAL_SOURCE_INVALID",
        message: `Skills group '${sourceId}' is not externally managed; use the regular uninstall flow.`,
      });
    }

    await this.options.stateStore.writeState({
      ...state,
      manifest: {
        ...state.manifest,
        sources: state.manifest.sources.filter((item) => item.id !== sourceId),
        bindings: Object.fromEntries(
          Object.entries(state.manifest.bindings).filter(([id]) => id !== sourceId),
        ),
      },
      lockFile: {
        ...state.lockFile,
        sources: Object.fromEntries(
          Object.entries(state.lockFile.sources).filter(([id]) => id !== sourceId),
        ),
        leafInventory: state.lockFile.leafInventory.filter((leaf) => leaf.sourceId !== sourceId),
        projections: state.lockFile.projections.filter((projection) => projection.sourceId !== sourceId),
      },
    });

    return ok({ removed: sourceId });
  }

  async deleteExternalSourceFiles(sourceId: string): Promise<Result<{ deleted: string[] }>> {
    const state = await this.options.stateStore.readState();
    const source = state.manifest.sources.find((item) => item.id === sourceId);
    const lock = state.lockFile.sources[sourceId];
    if (!source || !lock) {
      return fail({
        code: "SOURCE_NOT_FOUND",
        message: `Skills group id '${sourceId}' is not registered.`,
      });
    }
    if (source.kind !== "watch" && source.kind !== "command") {
      return fail({
        code: "EXTERNAL_SOURCE_INVALID",
        message: `Skills group '${sourceId}' is not externally managed.`,
      });
    }

    const warnings: Warning[] = [];
    const deleted: string[] = [];
    for (const observed of lock.observedTargets ?? []) {
      const resolved = path.resolve(observed.targetPath);
      if (isPathInside(this.options.stateStore.rootPath, resolved)) {
        continue;
      }
      try {
        await removePath(resolved);
        deleted.push(resolved);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        warnings.push({
          code: "EXTERNAL_FILE_DELETE_FAILED",
          message: `Unable to delete ${resolved}: ${String(error)}`,
        });
      }
    }

    // record kept, now Not Installed
    await this.commitRediscoveredState(source, lock, state, [], undefined);

    return ok({ deleted }, warnings);
  }

  async updateExternalSource(
    sourceId: string,
    options: { onStep: (step: string) => void },
  ): Promise<Result<SourceUpdateResultItem>> {
    const state = await this.options.stateStore.readState();
    const source = state.manifest.sources.find((item) => item.id === sourceId);
    const lock = state.lockFile.sources[sourceId];
    if (!source || !lock) {
      return fail({
        code: "SOURCE_NOT_FOUND",
        message: `Skills group id '${sourceId}' is not registered.`,
      });
    }
    if (source.kind !== "command" && source.kind !== "watch") {
      return fail({
        code: "EXTERNAL_SOURCE_INVALID",
        message: `Skills group '${sourceId}' is not externally managed.`,
      });
    }

    if (source.kind === "command") {
      const updateCommand = source.externalCommands?.update?.trim();
      if (updateCommand) {
        const run = await runExternalCommandChain("update", {
          command: updateCommand,
          onStep: options.onStep,
        });
        if (!run.ok) {
          return fail({
            code: run.errorCode ?? "EXTERNAL_COMMAND_FAILED",
            message: run.message ?? `The update command for '${sourceId}' failed.`,
          });
        }
      }
    }

    const previousLeafs = state.lockFile.leafInventory.filter((leaf) => leaf.sourceId === sourceId);
    const observedPaths = source.kind === "command"
      ? await this.discoverObservedPaths(state, source.displayName, { excludeSourceId: sourceId })
      : await this.rescanWatchPaths(state, lock);
    const versionOutput = source.kind === "command"
      ? await this.runVersionCommand(source)
      : undefined;
    const committed = await this.commitRediscoveredState(
      source,
      lock,
      state,
      observedPaths,
      versionOutput,
    );
    if (!committed.ok) {
      return fail(committed.errors, committed.warnings);
    }

    const diff = buildExternalDiff(sourceId, previousLeafs, committed.data.leafs);
    return ok(diff, committed.warnings);
  }

  private async rescanWatchPaths(
    state: Awaited<ReturnType<StateStore["readState"]>>,
    lock: SourceLockRecord,
  ): Promise<ExternalObservedPath[]> {
    const surviving: ExternalObservedPath[] = [];
    for (const observed of lock.observedTargets ?? []) {
      if (await pathExists(path.join(observed.targetPath, "SKILL.md"))) {
        surviving.push(observed);
      }
    }
    void state;
    return surviving;
  }

  private async runVersionCommand(
    source: SourceManifestRecord,
  ): Promise<string | undefined> {
    const versionCommand = source.externalCommands?.version?.trim();
    if (!versionCommand) {
      return undefined;
    }
    const run = await runExternalCommandChain("version", {
      command: versionCommand,
      onStep: () => {},
    });
    return run.ok ? run.output.trim() : undefined;
  }

  private async discoverObservedPaths(
    state: { lockFile: { sources: Record<string, { localPath: string }>; projections: Array<{ status: string; targetPath: string }> } },
    name: string,
    options: { excludeSourceId?: string } = {},
  ): Promise<ExternalObservedPath[]> {
    const matches: ExternalObservedPath[] = [];
    const managedCheckouts = new Set(
      Object.entries(state.lockFile.sources)
        .filter(([id]) => id !== options.excludeSourceId)
        .map(([, lock]) => path.resolve(lock.localPath)),
    );
    const managedTargetPaths = new Set(
      state.lockFile.projections
        .filter((projection) => projection.status === "active")
        .map((projection) => path.resolve(projection.targetPath)),
    );
    for (const target of TARGET_ORDER) {
      for (const rootPath of getTargetScanRoots(target).map((root) => path.resolve(root))) {
        const candidate = path.join(rootPath, name);
        if (!(await pathExists(path.join(candidate, "SKILL.md")))) {
          continue;
        }
        const resolved = path.resolve(candidate);
        if (managedCheckouts.has(resolved) || managedTargetPaths.has(resolved)) {
          continue;
        }
        if (matches.some((existing) => path.resolve(existing.targetPath) === resolved)) {
          continue;
        }
        matches.push({ target, rootPath, targetPath: candidate });
      }
    }
    return matches;
  }

  private async commitRediscoveredState(
    source: SourceManifestRecord,
    lock: SourceLockRecord,
    state: Awaited<ReturnType<StateStore["readState"]>>,
    observedPaths: ExternalObservedPath[],
    versionOutput: string | undefined,
  ): Promise<Result<ExternalSourceSnapshot>> {
    const leafs: LeafRecord[] = [];
    for (const observed of observedPaths) {
      const resolved = path.resolve(observed.targetPath);
      const leaf = await this.toLeafRecord(resolved, source.displayName);
      leafs.push({ ...leaf, sourceId: source.id, id: `${source.id}:${path.basename(resolved)}` });
    }

    const now = new Date().toISOString();
    const primaryPath = observedPaths.length > 0
      ? path.resolve(observedPaths[0]!.targetPath)
      : "";
    const contentHash = leafs.length > 0 ? await hashDirectory(leafs[0]!.absolutePath) : undefined;
    const nextLock: SourceLockRecord = {
      ...lock,
      localPath: primaryPath,
      revision: {
        provider: "command",
        ...(contentHash ? { contentHash } : {}),
        capturedAt: now,
      },
      leafIds: leafs.map((leaf) => leaf.id),
      observedTargets: observedPaths.map((observed) => ({
        target: observed.target,
        rootPath: observed.rootPath,
        targetPath: observed.targetPath,
      })),
      ...(contentHash ? { contentHash } : {}),
      ...(versionOutput !== undefined ? { lastVersionOutput: versionOutput } : {}),
    };

    await this.options.stateStore.writeState({
      ...state,
      manifest: {
        ...state.manifest,
        sources: state.manifest.sources.map((item) =>
          item.id === source.id ? { ...item, updatedAt: now } : item),
      },
      lockFile: {
        ...state.lockFile,
        sources: {
          ...state.lockFile.sources,
          [source.id]: nextLock,
        },
        leafInventory: [
          ...state.lockFile.leafInventory.filter((leaf) => leaf.sourceId !== source.id),
          ...leafs,
        ],
      },
    });

    return ok({
      manifest: source,
      lock: nextLock,
      leafs,
      leafCount: leafs.length,
      invalidLeafCount: 0,
    });
  }

  private allocateSourceId(baseId: string, state: { manifest: { sources: Array<{ id: string }> } }) {
    const taken = new Set(state.manifest.sources.map((source) => source.id));
    if (!taken.has(baseId)) {
      return baseId;
    }
    let index = 2;
    while (taken.has(`${baseId}-${index}`)) {
      index += 1;
    }
    return `${baseId}-${index}`;
  }

  private async toLeafRecord(absolutePath: string, fallbackTitle: string): Promise<LeafRecord> {
    const metadata = await this.readSkillMetadata(
      path.join(absolutePath, "SKILL.md"),
      fallbackTitle,
    );
    return {
      id: absolutePath,
      sourceId: "",
      relativePath: path.basename(absolutePath),
      linkName: path.basename(absolutePath),
      title: metadata.title,
      description: metadata.description,
      absolutePath,
      skillFilePath: path.join(absolutePath, "SKILL.md"),
      contentHash: await hashDirectory(absolutePath),
      selectors: { aliases: [path.basename(absolutePath)] },
      valid: true,
    };
  }

  private async readSkillMetadata(
    skillFilePath: string,
    fallbackName: string,
  ): Promise<{ title: string; description: string }> {
    const content = (await fs.readFile(skillFilePath, "utf8").catch(() => "")).replace(
      /\r\n?/g,
      "\n",
    );
    const frontmatter = parseSkillFrontmatter(content);
    const title = frontmatter?.data.name?.trim() || fallbackName;
    const description = frontmatter?.data.description?.trim() ?? "";
    return { title, description };
  }
}

function buildExternalDiff(
  sourceId: string,
  previousLeafs: LeafRecord[],
  nextLeafs: LeafRecord[],
): SourceUpdateResultItem {
  const previousById = new Map(previousLeafs.map((leaf) => [leaf.id, leaf]));
  const nextById = new Map(nextLeafs.map((leaf) => [leaf.id, leaf]));
  const diffs: SourceUpdateDiff[] = [];

  for (const previous of previousLeafs) {
    const next = nextById.get(previous.id);
    if (!next) {
      diffs.push({
        kind: "removed",
        sourceId,
        leafId: previous.id,
        relativePath: previous.relativePath,
        contentHash: previous.contentHash,
      });
      continue;
    }
    if (next.contentHash !== previous.contentHash) {
      diffs.push({
        kind: "changed",
        sourceId,
        leafId: next.id,
        relativePath: next.relativePath,
        contentHash: next.contentHash,
        previousLeafId: previous.id,
        previousRelativePath: previous.relativePath,
        previousContentHash: previous.contentHash,
      });
    }
  }

  for (const next of nextLeafs) {
    if (!previousById.has(next.id)) {
      diffs.push({
        kind: "added",
        sourceId,
        leafId: next.id,
        relativePath: next.relativePath,
        contentHash: next.contentHash,
      });
    }
  }

  return {
    sourceId,
    changed: diffs.length > 0,
    addedLeafIds: diffs.filter((diff) => diff.kind === "added").map((diff) => diff.leafId),
    removedLeafIds: diffs.filter((diff) => diff.kind === "removed").map((diff) => diff.leafId),
    invalidatedLeafIds: [],
    diffs,
  };
}

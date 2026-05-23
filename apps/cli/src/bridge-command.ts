import {
  buildBridgeResponse,
  type BridgeRequest,
  type BridgeResponse,
  isJsonObject,
  type JsonObject,
  type JsonValue,
} from "@skill-flow/shared-types/protocol";
import type {
  DeploymentRecord,
  DraftBinding,
  ImportDraft,
  LeafRecord,
  Manifest,
  ProjectScope,
  SourceBinding,
  WorkflowSummary,
} from "@skill-flow/domain/types";
import type { SkillFlowApp } from "@skill-flow/query/runtime";
import fs from "node:fs/promises";
import path from "node:path";

type BridgeFailure = {
  code: string;
  message: string;
};

export async function executeBridgeRequest(
  app: SkillFlowApp,
  request: BridgeRequest,
): Promise<BridgeResponse> {
  try {
    const previousCaller = process.env.SKILL_FLOW_CALLER;
    process.env.SKILL_FLOW_CALLER = previousCaller?.trim() || "bridge";
    try {
      switch (request.command) {
      case "bootstrap": {
        const result = await app.bootstrapWorkspaceState();
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "list": {
        const result = await app.listWorkflows();
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "inspect": {
        const payload = expectObjectPayload(request.payload, "inspect");
        const sourceId = expectString(payload.sourceId, "sourceId", "inspect");
        const scope = expectProjectScope(payload.scope);
        const result = await app.inspectSource(sourceId, scope);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        const data = await attachDesktopDetailContent(result.data);
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "inspect-enrichment": {
        const payload = expectObjectPayload(request.payload, "inspect-enrichment");
        const sourceId = expectString(payload.sourceId, "sourceId", "inspect-enrichment");
        const result = await app.inspectSourceEnrichment(sourceId);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "search-import-groups": {
        const payload = expectOptionalObject(request.payload, "search-import-groups");
        const query = payload ? expectOptionalString(payload.query, "query", "search-import-groups") : undefined;
        const result = await app.searchImportGroups(query ?? "");
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "preview-import-source": {
        const payload = expectObjectPayload(request.payload, "preview-import-source");
        const locator = expectString(payload.locator, "locator", "preview-import-source");
        const result = await app.previewImportSource(locator);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "import-source": {
        const payload = expectObjectPayload(request.payload, "import-source");
        const locator = expectString(payload.locator, "locator", "import-source");
        const draft = expectOptionalImportDraft(payload.draft);
        const result = await app.importSource(locator, draft);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "toggle-pin": {
        const payload = expectObjectPayload(request.payload, "toggle-pin");
        const sourceId = expectString(payload.sourceId, "sourceId", "toggle-pin");
        const result = await app.togglePinnedSource(sourceId);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "doctor": {
        const result = await app.doctor();
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "add": {
        const payload = expectObjectPayload(request.payload, "add");
        const locator = expectString(payload.locator, "locator", "add");
        const options = expectOptionalObject(payload.options, "add.options");
        const applyNow = payload.applyNow === true;
        const result = applyNow
          ? await app.addSource(locator, options as Parameters<SkillFlowApp["addSource"]>[1])
          : await app.prepareAddSource(locator, options as Parameters<SkillFlowApp["prepareAddSource"]>[1]);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "apply": {
        const payload = expectObjectPayload(request.payload, "apply");
        const sourceId = expectString(payload.sourceId, "sourceId", "apply");
        const draft = expectDraftBinding(payload.draft);
        const scope = expectProjectScope(payload.scope);
        const result = await app.applyDraft(sourceId, draft, scope);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "update": {
        const payload = expectOptionalObject(request.payload, "update");
        const sourceIds = parseOptionalStringArray(payload?.sourceIds, "update.sourceIds");
        const result = await app.updateSources(sourceIds);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
          warnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
        });
      }
      case "uninstall": {
        const payload = expectObjectPayload(request.payload, "uninstall");
        const sourceIds = parseRequiredStringArray(payload.sourceIds, "uninstall.sourceIds");
        const result = await app.uninstall(sourceIds);
        if (!result.ok) {
          return toFailureResponse(request, result.errors, result.warnings);
        }
        return buildResponseWithRequest({
          request,
          ok: true,
          data: sanitizeForJson(result.data),
        });
      }
      default:
        return buildResponseWithRequest({
          request,
          ok: false,
          errors: [
            {
              code: "UNSUPPORTED_COMMAND",
              message: `Bridge command '${request.command}' is not supported.`,
            },
          ],
        });
      }
    } finally {
      if (previousCaller === undefined) {
        delete process.env.SKILL_FLOW_CALLER;
      } else {
        process.env.SKILL_FLOW_CALLER = previousCaller;
      }
    }
  } catch (error) {
    return buildResponseWithRequest({
      request,
      ok: false,
      errors: [
        {
          code: "BRIDGE_REQUEST_INVALID",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    });
  }
}

function toFailureResponse(
  request: BridgeRequest,
  errors: Array<{ code: string; message: string }>,
  warnings: Array<{ code: string; message: string }>,
): BridgeResponse {
  return buildResponseWithRequest({
    request,
    ok: false,
    warnings: warnings.map((warning) => ({ code: warning.code, message: warning.message })),
    errors: errors.map((error) => ({ code: error.code, message: error.message })),
  });
}

function buildResponseWithRequest(
  args: Omit<Parameters<typeof buildBridgeResponse>[0], "command" | "requestId"> & {
    request: BridgeRequest;
  },
): BridgeResponse {
  return buildBridgeResponse({
    command: args.request.command,
    ...(args.request.requestId ? { requestId: args.request.requestId } : {}),
    ok: args.ok,
    ...(args.data !== undefined ? { data: args.data } : {}),
    ...(args.warnings ? { warnings: args.warnings } : {}),
    ...(args.errors ? { errors: args.errors } : {}),
  });
}

function expectObjectPayload(payload: JsonValue | undefined, command: string): JsonObject {
  if (!isJsonObject(payload)) {
    throw new Error(`Bridge command '${command}' requires an object payload.`);
  }
  return payload;
}

function expectOptionalObject(value: JsonValue | undefined, field: string): JsonObject | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isJsonObject(value)) {
    throw new Error(`Field '${field}' must be a JSON object when provided.`);
  }
  return value;
}

function expectString(value: JsonValue | undefined, field: string, command: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Bridge command '${command}' requires a non-empty string field '${field}'.`);
  }
  return value;
}

function expectOptionalString(
  value: JsonValue | undefined,
  field: string,
  command: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Bridge command '${command}' requires string field '${field}' when provided.`);
  }
  return value;
}

function parseRequiredStringArray(value: JsonValue | undefined, field: string): string[] {
  const parsed = parseOptionalStringArray(value, field);
  if (!parsed || parsed.length === 0) {
    throw new Error(`Field '${field}' must be a non-empty string array.`);
  }
  return parsed;
}

function parseOptionalStringArray(value: JsonValue | undefined, field: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`Field '${field}' must be a string array.`);
  }
  return value as string[];
}

function expectDraftBinding(value: JsonValue | undefined): DraftBinding {
  if (!isJsonObject(value)) {
    throw new Error("Bridge command 'apply' requires object field 'draft'.");
  }
  const selectedLeafIds = parseOptionalStringArray(value.selectedLeafIds, "draft.selectedLeafIds");
  if (!selectedLeafIds) {
    throw new Error("Field 'draft.selectedLeafIds' must be a string array.");
  }
  const enabledTargets = parseOptionalStringArray(value.enabledTargets, "draft.enabledTargets") ?? [];
  return {
    selectedLeafIds,
    enabledTargets: enabledTargets as DraftBinding["enabledTargets"],
  };
}

function expectOptionalImportDraft(value: JsonValue | undefined): ImportDraft | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isJsonObject(value)) {
    throw new Error("Field 'draft' must be a JSON object when provided.");
  }

  const selectedSkillIds = parseOptionalStringArray(value.selectedSkillIds, "draft.selectedSkillIds");
  if (!selectedSkillIds) {
    throw new Error("Field 'draft.selectedSkillIds' must be a string array.");
  }

  const enabledTargets = parseOptionalStringArray(value.enabledTargets, "draft.enabledTargets") ?? [];

  return {
    selectedSkillIds,
    enabledTargets: enabledTargets as ImportDraft["enabledTargets"],
  };
}

function expectProjectScope(value: JsonValue | undefined): ProjectScope {
  if (value === undefined) {
    return { kind: "global" };
  }

  if (!isJsonObject(value) || typeof value.kind !== "string") {
    throw new Error(
      "Field 'scope' must be a JSON object with kind 'global' or kind 'project' and a non-empty string 'projectId'.",
    );
  }

  if (value.kind === "global") {
    return { kind: "global" };
  }

  if (value.kind === "project") {
    if (typeof value.projectId === "string" && value.projectId.length > 0) {
      return { kind: "project", projectId: value.projectId };
    }

    throw new Error("Field 'scope.projectId' must be a non-empty string when scope.kind is 'project'.");
  }

  throw new Error("Field 'scope.kind' must be either 'global' or 'project'.");
}

function sanitizeForJson<T>(value: T): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

type InspectData = {
  summary: WorkflowSummary;
  source: Manifest["sources"][number];
  binding: SourceBinding;
  leafs: LeafRecord[];
  deployments: DeploymentRecord[];
};

type BridgeDetailDocument = {
  id: string;
  title: string;
  path: string;
  metadata: Array<{ id: string; key: string; value: string }>;
  renderCacheKey: string;
  content: string;
  isLoaded: boolean;
};

type BridgeFileTreeItem = {
  id: string;
  title: string;
  path: string;
  isDirectory: boolean;
  isSkillRoot: boolean;
  isSkillDocument: boolean;
  skillId?: string;
  children: BridgeFileTreeItem[];
};

async function attachDesktopDetailContent(data: InspectData): Promise<InspectData & {
  groupDocuments: BridgeDetailDocument[];
  fileTree: BridgeFileTreeItem[];
}> {
  const checkoutPath = typeof data.summary.lock?.checkoutPath === "string"
    ? data.summary.lock.checkoutPath
    : undefined;
  const groupDocuments = await buildGroupDocuments(checkoutPath);
  const fileTree = await buildFileTree(checkoutPath, data.leafs);
  const leafs = await Promise.all(data.leafs.map(async (leaf) => {
    const skillFilePath = leaf.skillFilePath
      || (checkoutPath ? path.join(checkoutPath, leaf.relativePath, "SKILL.md") : undefined)
      || path.join(leaf.absolutePath, "SKILL.md");
    const documents = await buildSkillDocuments(skillFilePath);
    const documentContent = documents[0]?.content || leaf.description;
    return {
      ...leaf,
      documents,
      documentContent,
    };
  }));

  return {
    ...data,
    leafs,
    groupDocuments,
    fileTree: fileTree.length > 0 ? fileTree : fallbackFileTreeFromLeafs(data.leafs),
  };
}

async function buildGroupDocuments(checkoutPath: string | undefined): Promise<BridgeDetailDocument[]> {
  const documents: BridgeDetailDocument[] = [{
    id: "group:filetree",
    title: "File Tree",
    path: checkoutPath ?? ".",
    metadata: [],
    renderCacheKey: documentRenderCacheKey(checkoutPath ?? "."),
    content: "",
    isLoaded: true,
  }];

  if (!checkoutPath) {
    return documents;
  }

  const entries = await fs.readdir(checkoutPath, { withFileTypes: true }).catch(() => []);
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort(compareRootDocumentNames);

  for (const entry of markdownFiles) {
    const fullPath = path.join(checkoutPath, entry);
    documents.push(await loadDocument({
      id: `group:${fullPath}`,
      title: entry,
      path: fullPath,
    }));
  }

  return documents;
}

async function buildSkillDocuments(skillFilePath: string | undefined): Promise<BridgeDetailDocument[]> {
  if (!skillFilePath) {
    return [];
  }

  const documents: BridgeDetailDocument[] = [
    await loadDocument({
      id: skillFilePath,
      title: "SKILL.md",
      path: skillFilePath,
      fallbackContent: "SKILL.md unavailable.",
    }),
  ];

  const referencesPath = path.join(path.dirname(skillFilePath), "references");
  const entries = await fs.readdir(referencesPath, { withFileTypes: true }).catch(() => []);
  for (const entry of entries
    .filter((candidate) => candidate.isFile() && candidate.name.toLowerCase().endsWith(".md"))
    .map((candidate) => candidate.name)
    .sort()) {
    const fullPath = path.join(referencesPath, entry);
    documents.push(await loadDocument({
      id: fullPath,
      title: `references/${entry}`,
      path: fullPath,
    }));
  }

  return documents;
}

async function loadDocument(args: {
  id: string;
  title: string;
  path: string;
  fallbackContent?: string;
}): Promise<BridgeDetailDocument> {
  const raw = await fs.readFile(args.path, "utf8").catch(() =>
    args.fallbackContent ?? `${args.title || "Document"} unavailable.`,
  );
  const parsed = parseDetailDocument(raw);
  return {
    id: args.id,
    title: args.title,
    path: args.path,
    metadata: parsed.metadata,
    renderCacheKey: documentRenderCacheKey(args.path),
    content: parsed.body,
    isLoaded: true,
  };
}

function parseDetailDocument(content: string): {
  metadata: Array<{ id: string; key: string; value: string }>;
  body: string;
} {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { metadata: [], body: content.trim() };
  }

  const closingIndex = lines.slice(1).findIndex((line) => line.trim() === "---");
  if (closingIndex < 0) {
    return { metadata: [], body: content.trim() };
  }

  const absoluteClosingIndex = closingIndex + 1;
  const frontMatterLines = lines.slice(1, absoluteClosingIndex);
  const body = lines.slice(absoluteClosingIndex + 1).join("\n").trim();
  const metadata = parseFrontmatterEntries(frontMatterLines);

  return { metadata, body };
}

function parseFrontmatterEntries(lines: string[]): Array<{ id: string; key: string; value: string }> {
  const entries: Array<{ id: string; key: string; value: string }> = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!pair?.[1] || pair[2] === undefined) {
      index += 1;
      continue;
    }

    const key = pair[1];
    const rest = pair[2].trim();
    let value = "";

    if (rest === "|" || rest === ">") {
      const blockLines: string[] = [];
      index += 1;
      while (index < lines.length) {
        const blockLine = lines[index] ?? "";
        if (blockLine.length === 0) {
          blockLines.push("");
          index += 1;
          continue;
        }
        if (!/^\s+/.test(blockLine)) {
          break;
        }
        blockLines.push(blockLine.replace(/^\s{2}/, ""));
        index += 1;
      }
      value = blockLines.join(rest === ">" ? " " : "\n").trim();
    } else if (rest === "") {
      const values: string[] = [];
      index += 1;
      while (index < lines.length) {
        const listLine = lines[index] ?? "";
        const item = /^\s*-\s+(.+)$/.exec(listLine);
        if (!item?.[1]) {
          break;
        }
        values.push(normalizeFrontmatterScalar(item[1]));
        index += 1;
      }
      value = values.join(", ");
    } else {
      value = normalizeFrontmatterScalar(rest);
      index += 1;
    }

    if (value) {
      entries.push({ id: `${key}:${value}`, key, value });
    }
  }

  return entries;
}

function normalizeFrontmatterScalar(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  const inlineArray = /^\[(.*)\]$/.exec(trimmed);
  if (!inlineArray?.[1]) {
    return trimmed;
  }
  return inlineArray[1]
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .join(", ");
}

async function buildFileTree(
  checkoutPath: string | undefined,
  leafs: InspectData["leafs"],
): Promise<BridgeFileTreeItem[]> {
  if (!checkoutPath) {
    return [];
  }
  const rootEntries = await fs.readdir(checkoutPath, { withFileTypes: true }).catch(() => []);
  const skillByFolder = new Map(leafs.map((leaf) => [path.resolve(leaf.absolutePath), leaf.id]));
  const skillByDocument = new Map(leafs.map((leaf) => [path.resolve(leaf.skillFilePath), leaf.id]));
  return Promise.all(rootEntries
    .filter((entry) => shouldIncludeFileTreeEntry(entry.name))
    .sort(compareDirents)
    .map((entry) => buildFileTreeItem(path.join(checkoutPath, entry.name), checkoutPath, skillByFolder, skillByDocument)));
}

async function buildFileTreeItem(
  itemPath: string,
  rootPath: string,
  skillByFolder: Map<string, string>,
  skillByDocument: Map<string, string>,
): Promise<BridgeFileTreeItem> {
  const stat = await fs.lstat(itemPath);
  const isDirectory = stat.isDirectory();
  const resolvedPath = path.resolve(itemPath);
  const relativePath = toPosixPath(path.relative(rootPath, itemPath)) || ".";
  const children = isDirectory
    ? await fs.readdir(itemPath, { withFileTypes: true })
      .then((entries) => Promise.all(entries
        .filter((entry) => shouldIncludeFileTreeEntry(entry.name))
        .sort(compareDirents)
        .map((entry) => buildFileTreeItem(
          path.join(itemPath, entry.name),
          rootPath,
          skillByFolder,
          skillByDocument,
        ))))
      .catch(() => [])
    : [];
  const skillId = skillByFolder.get(resolvedPath) ?? skillByDocument.get(resolvedPath);

  return {
    id: `root/${relativePath}`,
    title: path.basename(itemPath),
    path: itemPath,
    isDirectory,
    isSkillRoot: isDirectory && Boolean(skillByFolder.get(resolvedPath)),
    isSkillDocument: !isDirectory && Boolean(skillByDocument.get(resolvedPath)),
    ...(skillId ? { skillId } : {}),
    children,
  };
}

function fallbackFileTreeFromLeafs(leafs: InspectData["leafs"]): BridgeFileTreeItem[] {
  return leafs.map((leaf) => ({
    id: leaf.id,
    title: leaf.linkName || leaf.name || leaf.id,
    path: leaf.relativePath,
    isDirectory: true,
    isSkillRoot: true,
    isSkillDocument: false,
    skillId: leaf.id,
    children: [],
  }));
}

function shouldIncludeFileTreeEntry(name: string): boolean {
  return !name.startsWith(".git") && name !== "node_modules";
}

function compareDirents(
  left: { name: string; isDirectory(): boolean },
  right: { name: string; isDirectory(): boolean },
): number {
  if (left.isDirectory() !== right.isDirectory()) {
    return left.isDirectory() ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

function compareRootDocumentNames(left: string, right: string): number {
  const leftRank = rootDocumentRank(left);
  const rightRank = rootDocumentRank(right);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  return left.localeCompare(right);
}

function rootDocumentRank(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized === "readme.md") {
    return 0;
  }
  if (normalized.startsWith("readme.")) {
    return 1;
  }
  if (normalized === "changelog.md") {
    return 2;
  }
  return 3;
}

function documentRenderCacheKey(documentPath: string): string {
  return `document:${documentPath}`;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function buildBridgeParseFailure(command: string, failure: BridgeFailure): BridgeResponse {
  return buildBridgeResponse({
    command: command as BridgeRequest["command"],
    ok: false,
    errors: [failure],
  });
}

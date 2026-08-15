import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { StateStore } from "@skill-flow/storage/state-store";
import { DoctorService } from "../services/doctor-service.js";
import { ExternalSourceService } from "../services/external-source-service.js";
import { skillDoc, useSkillFlowSandbox } from "./test-helpers.js";

describe.sequential("ExternalSourceService", () => {
  const sandbox = useSkillFlowSandbox();

  function makeService() {
    const stateStore = new StateStore(sandbox.stateRoot);
    return { stateStore, service: new ExternalSourceService({ stateStore }) };
  }

  async function writeTargetSkill(target: string, name: string, description = "A skill.") {
    const dir = path.join(sandbox.targetsRoot, target, name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "SKILL.md"), skillDoc(name, description));
    return dir;
  }

  test("registers a watch source from an on-disk target skill without creating a checkout", async () => {
    const dir = await writeTargetSkill("claude", "my-notes");
    const { stateStore, service } = makeService();
    await stateStore.init();

    const result = await service.addWatchSource({
      displayName: "my-notes",
      observedPaths: [{ target: "claude-code", rootPath: path.join(sandbox.targetsRoot, "claude"), targetPath: dir }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const state = await stateStore.readState();
    expect(state.manifest.sources).toEqual([
      expect.objectContaining({
        kind: "watch",
        displayName: "my-notes",
        locator: dir,
        canonicalLocator: dir,
        enabled: true,
      }),
    ]);
    const lock = state.lockFile.sources[result.data.manifest.id]!;
    expect(lock.observedTargets).toEqual([
      {
        target: "claude-code",
        rootPath: path.join(sandbox.targetsRoot, "claude"),
        targetPath: dir,
      },
    ]);
    expect(lock.revision.provider).toBe("watch");
    expect(lock.contentHash).toEqual(result.data.lock.contentHash);
    expect(lock.localPath).toBe(dir);
    // leaf points at the on-disk path, and no managed checkout exists
    expect(state.lockFile.leafInventory).toEqual([
      expect.objectContaining({
        sourceId: result.data.manifest.id,
        absolutePath: dir,
        linkName: "my-notes",
        valid: true,
      }),
    ]);
    await expect(fs.access(path.join(sandbox.stateRoot, "source"))).rejects.toThrow();

    // doctor no longer flags the registered path as unmanaged
    const doctor = await new DoctorService().run(state.manifest, state.lockFile, {
      schemaVersion: 2,
      migrationGeneration: "mg_test",
      pinnedSourceIds: [],
      selectedProjectScope: { kind: "global" },
      recentProjects: [],
      projectSourceDrafts: {},
      customTargets: [],
      agentDisplayOrder: [],
    });
    expect(doctor.ok).toBe(true);
    expect(doctor.data?.issues.filter((issue) =>
      issue.code === "UNMANAGED_EXTERNAL_TARGET_SKILL")).toEqual([]);
  });

  test("rejects a watch source whose path does not exist", async () => {
    const { stateStore, service } = makeService();
    await stateStore.init();

    const result = await service.addWatchSource({
      displayName: "ghost",
      observedPaths: [{
        target: "claude-code",
        rootPath: path.join(sandbox.targetsRoot, "claude"),
        targetPath: path.join(sandbox.targetsRoot, "claude", "ghost"),
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("EXTERNAL_PATH_NOT_FOUND");
  });

  test("registers a command source with install/update commands", async () => {
    const dir = await writeTargetSkill("codex", "agent-reach");
    const { stateStore, service } = makeService();
    await stateStore.init();

    const result = await service.addCommandSource({
      displayName: "agent-reach",
      commands: {
        install: "agent-reach skill --install",
        update: "pipx upgrade agent-reach && agent-reach skill --install",
      },
      observedPaths: [{ target: "codex", rootPath: path.join(sandbox.targetsRoot, "codex"), targetPath: dir }],
      presetToolName: "agent-reach",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const state = await stateStore.readState();
    const source = state.manifest.sources[0]!;
    expect(source.kind).toBe("command");
    expect(source.externalCommands).toEqual({
      install: "agent-reach skill --install",
      update: "pipx upgrade agent-reach && agent-reach skill --install",
    });
    expect(source.presetToolName).toBe("agent-reach");
    const lock = state.lockFile.sources[source.id]!;
    expect(lock.revision.provider).toBe("command");
    expect(lock.externalCommands).toEqual(source.externalCommands);
    expect(lock.observedTargets?.[0]?.targetPath).toBe(dir);
  });

  test("registers a command source with no on-disk files as not installed", async () => {
    const { stateStore, service } = makeService();
    await stateStore.init();

    const result = await service.addCommandSource({
      displayName: "fresh-tool",
      commands: { install: "fresh-tool install" },
      observedPaths: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const state = await stateStore.readState();
    expect(state.lockFile.sources[result.data.manifest.id]!.leafIds).toEqual([]);
    expect(state.lockFile.leafInventory.filter((leaf) =>
      leaf.sourceId === result.data.manifest.id)).toEqual([]);
  });

  test("rejects a command source without any command", async () => {
    const { stateStore, service } = makeService();
    await stateStore.init();

    const result = await service.addCommandSource({
      displayName: "empty",
      commands: {},
      observedPaths: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("EXTERNAL_COMMAND_REQUIRED");
  });

  test("rejects registration when the path is already managed by skill-flow", async () => {
    const dir = await writeTargetSkill("claude", "taken");
    const { stateStore, service } = makeService();
    await stateStore.init();

    // simulate an existing managed projection covering the path
    const state = await stateStore.readState();
    await stateStore.writeState({
      ...state,
      lockFile: {
        ...state.lockFile,
        projections: [{
          target: "claude-code",
          sourceId: "other",
          leafId: "other:skills/taken",
          targetPath: dir,
          strategy: "symlink",
          contentHash: "hash",
          status: "active",
          updatedAt: new Date().toISOString(),
        }],
      },
    });

    const result = await service.addWatchSource({
      displayName: "taken",
      observedPaths: [{ target: "claude-code", rootPath: path.join(sandbox.targetsRoot, "claude"), targetPath: dir }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("EXTERNAL_PATH_ALREADY_MANAGED");
  });

  test("install runs the install command, rediscovers paths, and records the version output", async () => {
    const { stateStore, service } = makeService();
    await stateStore.init();

    const skillRoot = path.join(sandbox.targetsRoot, "claude", "tool-x");
    const installScript = path.join(sandbox.sandboxRoot, "install-tool-x.sh");
    await fs.writeFile(installScript, [
      "#!/bin/sh",
      `mkdir -p "${skillRoot}"`,
      `printf -- '---\\nname: tool-x\\ndescription: Installed.\\n---\\n' > "${skillRoot}/SKILL.md"`,
      "",
    ].join("\n"), { mode: 0o755 });

    const registered = await service.addCommandSource({
      displayName: "tool-x",
      commands: {
        install: `${installScript}`,
        version: "/bin/echo tool-x 1.2.3",
      },
      observedPaths: [],
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const installed = await service.installCommandSource(registered.data.manifest.id, {
      onStep: () => {},
    });
    expect(installed.ok).toBe(true);
    if (!installed.ok) {
      return;
    }

    const state = await stateStore.readState();
    const lock = state.lockFile.sources[registered.data.manifest.id]!;
    expect(lock.observedTargets?.map((observed) => observed.targetPath)).toEqual([skillRoot]);
    expect(lock.leafIds.length).toBe(1);
    expect(state.lockFile.leafInventory.some((leaf) =>
      leaf.sourceId === registered.data.manifest.id && leaf.absolutePath === skillRoot)).toBe(true);
    expect(lock.lastVersionOutput).toContain("tool-x 1.2.3");
    // files exist, no managed checkout appeared
    await expect(fs.access(path.join(skillRoot, "SKILL.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(sandbox.stateRoot, "source", "command"))).rejects.toThrow();
  });

  test("install fails cleanly when the command fails and state is unchanged", async () => {
    const { stateStore, service } = makeService();
    await stateStore.init();

    const registered = await service.addCommandSource({
      displayName: "broken-tool",
      commands: { install: "/usr/bin/false" },
      observedPaths: [],
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const installed = await service.installCommandSource(registered.data.manifest.id, {
      onStep: () => {},
    });
    expect(installed.ok).toBe(false);
    expect(installed.errors[0]?.code).toBe("EXTERNAL_COMMAND_FAILED");

    const state = await stateStore.readState();
    expect(state.lockFile.sources[registered.data.manifest.id]!.leafIds).toEqual([]);
    expect(state.lockFile.leafInventory.filter((leaf) =>
      leaf.sourceId === registered.data.manifest.id)).toEqual([]);
  });

  test("install rejects a source without an install command", async () => {
    const { stateStore, service } = makeService();
    await stateStore.init();

    const registered = await service.addCommandSource({
      displayName: "update-only",
      commands: { update: "tool update" },
      observedPaths: [],
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const installed = await service.installCommandSource(registered.data.manifest.id, {
      onStep: () => {},
    });
    expect(installed.ok).toBe(false);
    expect(installed.errors[0]?.code).toBe("EXTERNAL_INSTALL_COMMAND_MISSING");
  });
});

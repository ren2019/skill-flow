import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { DoctorService } from "@skill-flow/core-engine/services/doctor-service";
import { StateStore } from "@skill-flow/storage/state-store";
import { SkillFlowApp } from "@skill-flow/query/runtime";
import { skillDoc, useSkillFlowSandbox } from "./test-helpers.js";

function runCli(args: string[]): string {
  return execFileSync("node", [
    "--import",
    "tsx",
    "src/cli.tsx",
    ...args,
  ], {
    cwd: path.resolve(import.meta.dirname, "../.."),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe.sequential("externally managed sources (CLI)", () => {
  const sandbox = useSkillFlowSandbox();

  async function writeTargetSkill(target: string, name: string) {
    const dir = path.join(sandbox.targetsRoot, target, name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "SKILL.md"), skillDoc(name, "An external skill."));
    return dir;
  }

  test("add --watch registers an on-disk target skill and silences the doctor warning", { timeout: 60_000 }, async () => {
    const dir = await writeTargetSkill("claude", "handwritten");

    // before registration the doctor flags it
    const stateStore = new StateStore(sandbox.stateRoot);
    await stateStore.init();
    const initialState = await stateStore.readState();
    const initialDoctor = await new DoctorService().run(
      initialState.manifest,
      initialState.lockFile,
      initialState.preferences,
    );
    expect(
      initialDoctor.data?.issues.some((issue) =>
        issue.code === "UNMANAGED_EXTERNAL_TARGET_SKILL" && issue.message.includes(dir)),
    ).toBe(true);

    const output = runCli(["add", dir, "--watch"]);
    expect(output).toContain("Registered watch skills group 'handwritten'");

    // catalog lists it as a watch group
    const app = new SkillFlowApp();
    const list = await app.listWorkflows();
    expect(list.ok).toBe(true);
    const summary = list.data?.summaries.find((entry) => entry.source.id === "handwritten");
    expect(summary?.source.kind).toBe("watch");

    // doctor warning gone, files untouched, no checkout created
    const state = await stateStore.readState();
    expect(state.manifest.sources.find((item) => item.id === "handwritten")?.kind).toBe("watch");
    const doctor = await new DoctorService().run(state.manifest, state.lockFile, state.preferences);
    expect(
      doctor.data?.issues.some((issue) =>
        issue.code === "UNMANAGED_EXTERNAL_TARGET_SKILL" && issue.message.includes(dir)),
    ).toBe(false);
    expect(await fs.stat(path.join(dir, "SKILL.md"))).toBeTruthy();
    await expect(fs.access(path.join(sandbox.stateRoot, "source", "watch", "handwritten"))).rejects.toThrow();
  });

  test("add --watch rejects a path outside every target root", async () => {
    const outside = path.join(sandbox.sandboxRoot, "not-a-target");
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(path.join(outside, "SKILL.md"), skillDoc("outside", "Nowhere."));

    const app = new SkillFlowApp();
    const result = await app.addWatchSourceByPath(outside);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("EXTERNAL_PATH_NOT_IN_TARGET_ROOT");
  });

  test("add --watch refuses a path that is already managed by skill-flow", async () => {
    const dir = await writeTargetSkill("codex", "claimed");

    const app = new SkillFlowApp();
    const stateStore = new StateStore(sandbox.stateRoot);
    await stateStore.init();

    // simulate an active managed projection covering the path
    const state = await stateStore.readState();
    await stateStore.writeState({
      ...state,
      lockFile: {
        ...state.lockFile,
        projections: [{
          target: "codex",
          sourceId: "other",
          leafId: "other:claimed",
          targetPath: dir,
          strategy: "symlink",
          contentHash: "hash",
          status: "active",
          updatedAt: new Date().toISOString(),
        }],
      },
    });

    const result = await app.addWatchSourceByPath(dir);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("EXTERNAL_PATH_ALREADY_MANAGED");
  });

  test("add --command registers from the preset and discovers on-disk paths", { timeout: 60_000 }, async () => {
    const claudeDir = await writeTargetSkill("claude", "agent-reach");
    await writeTargetSkill("codex", "agent-reach");

    const output = runCli(["add", "agent-reach", "--command"]);
    expect(output).toContain("Registered command skills group 'agent-reach'");

    const stateStore = new StateStore(sandbox.stateRoot);
    const state = await stateStore.readState();
    const source = state.manifest.sources.find((item) => item.id === "agent-reach");
    expect(source?.kind).toBe("command");
    expect(source?.presetToolName).toBe("agent-reach");
    expect(source?.externalCommands?.install).toBe("agent-reach skill --install");
    expect(source?.externalCommands?.update).toContain("pipx upgrade agent-reach");
    const lock = state.lockFile.sources["agent-reach"]!;
    expect(lock.observedTargets?.map((observed) => observed.targetPath).sort()).toEqual(
      [claudeDir, path.join(sandbox.targetsRoot, "codex", "agent-reach")].sort(),
    );
    expect(state.lockFile.leafInventory.filter((leaf) => leaf.sourceId === "agent-reach").length).toBe(2);
  });

  test("add --command registers a not-yet-installed tool with empty leafs", { timeout: 60_000 }, async () => {
    const output = runCli([
      "add", "fresh-tool", "--command",
      "--install", "fresh-tool install",
      "--update", "fresh-tool update",
    ]);
    expect(output).toContain("Registered command skills group 'fresh-tool'");

    const stateStore = new StateStore(sandbox.stateRoot);
    const state = await stateStore.readState();
    const source = state.manifest.sources.find((item) => item.id === "fresh-tool");
    expect(source?.kind).toBe("command");
    expect(source?.externalCommands).toEqual({
      install: "fresh-tool install",
      update: "fresh-tool update",
    });
    expect(state.lockFile.sources["fresh-tool"]!.leafIds).toEqual([]);
  });

  test("add --command without preset or commands is rejected", { timeout: 60_000 }, async () => {
    const app = new SkillFlowApp();
    const result = await app.addCommandSourceByTool({ toolName: "unknown-tool" });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("EXTERNAL_COMMAND_REQUIRED");
  });
});

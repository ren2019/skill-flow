import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { runExternalCommandChain } from "../services/external-command-executor.js";

function scriptDir(name: string) {
  return path.join(os.tmpdir(), `sf-exec-test-${process.pid}-${name}`);
}

describe("runExternalCommandChain", () => {
  test("runs a single command via execFile without a shell", async () => {
    const result = await runExternalCommandChain("echo-agent-reach", {
      command: "/bin/echo hello",
      onStep: () => {},
    });

    expect(result.ok).toBe(true);
    expect(result.output.trim()).toBe("hello");
  });

  test("runs && chained commands sequentially and keeps outputs", async () => {
    const dir = scriptDir("chain");
    await fs.mkdir(dir, { recursive: true });
    const marker = path.join(dir, "marker.txt");

    const result = await runExternalCommandChain("install", {
      command: `/usr/bin/touch ${marker} && /bin/echo done`,
      onStep: () => {},
    });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("done");
    await expect(fs.access(marker)).resolves.toBeUndefined();
  });

  test("stops the chain when one step fails and reports the step", async () => {
    const steps: string[] = [];
    const result = await runExternalCommandChain("install", {
      command: "/usr/bin/false && /bin/echo should-not-run",
      onStep: (step) => steps.push(step),
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("EXTERNAL_COMMAND_FAILED");
    expect(result.message).toContain("/usr/bin/false");
    expect(steps).toEqual(["/usr/bin/false"]);
  });

  test("rejects shell-only syntax instead of silently misrunning it", async () => {
    const result = await runExternalCommandChain("install", {
      command: "/bin/echo a; /bin/echo b",
      onStep: () => {},
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("EXTERNAL_COMMAND_SYNTAX");
  });

  test("records each executed step through onStep for audit", async () => {
    const steps: string[] = [];
    await runExternalCommandChain("version", {
      command: "/bin/echo one && /bin/echo two",
      onStep: (step) => steps.push(step),
    });

    expect(steps).toEqual(["/bin/echo one", "/bin/echo two"]);
  });
});

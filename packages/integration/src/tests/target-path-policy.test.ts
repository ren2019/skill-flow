import { describe, expect, test } from "vitest";
import { getTargetHomePathCandidates, getTargetPathPolicy, resolveTargetSupportFilePath } from "../utils/constants.js";

describe("target path policy", () => {
  test("expands documented global and compatibility paths for Windows fixtures", () => {
    const windowsHome = String.raw`C:\Users\test`;

    expect(getTargetPathPolicy("codex", { platform: "win32", homeDir: windowsHome })).toMatchObject({
      documentedGlobalPath: String.raw`C:\Users\test\.codex\skills`,
      writeRootCandidates: [String.raw`C:\Users\test\.codex\skills`],
    });
    expect(getTargetPathPolicy("opencode", { platform: "win32", homeDir: windowsHome })).toMatchObject({
      documentedGlobalPath: String.raw`C:\Users\test\.config\opencode\skills`,
      writeRootCandidates: [String.raw`C:\Users\test\.config\opencode\skills`],
    });
    expect(getTargetPathPolicy("amp", { platform: "win32", homeDir: windowsHome })).toMatchObject({
      documentedGlobalPath: String.raw`C:\Users\test\.config\agents\skills`,
      writeRootCandidates: [String.raw`C:\Users\test\.config\agents\skills`],
    });
    expect(getTargetPathPolicy("openclaw", { platform: "win32", homeDir: windowsHome }).compatReadRootCandidates).toEqual([
      String.raw`C:\Users\test\.clawdbot\skills`,
      String.raw`C:\Users\test\.moltbot\skills`,
    ]);
  });

  test("expands documented global and compatibility paths for Linux fixtures", () => {
    const linuxHome = "/home/test";

    expect(getTargetPathPolicy("codex", { platform: "linux", homeDir: linuxHome })).toMatchObject({
      documentedGlobalPath: "/home/test/.codex/skills",
      writeRootCandidates: ["/home/test/.codex/skills"],
    });
    expect(getTargetPathPolicy("opencode", { platform: "linux", homeDir: linuxHome })).toMatchObject({
      documentedGlobalPath: "/home/test/.config/opencode/skills",
      writeRootCandidates: ["/home/test/.config/opencode/skills"],
    });
    expect(getTargetPathPolicy("amp", { platform: "linux", homeDir: linuxHome })).toMatchObject({
      documentedGlobalPath: "/home/test/.config/agents/skills",
      writeRootCandidates: ["/home/test/.config/agents/skills"],
    });
    expect(getTargetPathPolicy("openclaw", { platform: "linux", homeDir: linuxHome }).compatReadRootCandidates).toEqual([
      "/home/test/.clawdbot/skills",
      "/home/test/.moltbot/skills",
    ]);
  });

  test("derives support-file and home candidates from the same target policy", () => {
    expect(resolveTargetSupportFilePath("cline", ".skill-lock.json", {
      platform: "linux",
      homeDir: "/home/test",
    })).toBe("/home/test/.agents/.skill-lock.json");

    expect(getTargetHomePathCandidates("opencode", {
      platform: "linux",
      homeDir: "/home/test",
    })).toEqual([
      "/home/test/.config/opencode",
      "/home/test/.opencode",
    ]);
  });
});

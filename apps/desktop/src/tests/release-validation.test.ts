import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const validateScriptPath = path.join(repoRoot, "scripts/release/validate-desktop-artifacts.sh");

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("desktop release validation script", () => {
  it("validates macos artifacts from an overridden dist root", () => {
    const distRoot = createDistRoot();
    writeCliArtifacts(distRoot, "macos");
    writeDesktopArtifacts(distRoot, "macos", ["Skill Flow Desktop.zip", "Skill Flow Desktop_1.3.1_aarch64.dmg"]);

    const result = runValidate("macos", distRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Desktop release artifacts validated for macos");
  });

  it("validates linux and windows artifact expectations from an overridden dist root", () => {
    const distRoot = createDistRoot();
    writeCliArtifacts(distRoot, "linux");
    writeDesktopArtifacts(distRoot, "linux", ["Skill Flow Desktop.AppImage", "skill-flow-desktop_1.3.1_amd64.deb"]);
    writeCliArtifacts(distRoot, "windows");
    writeDesktopArtifacts(distRoot, "windows", ["Skill Flow Desktop_1.3.1_x64.msi", "Skill Flow Desktop_1.3.1_x64-setup.exe"]);

    const linuxResult = runValidate("linux", distRoot);
    const windowsResult = runValidate("windows", distRoot);

    expect(linuxResult.status).toBe(0);
    expect(linuxResult.stdout).toContain("Desktop release artifacts validated for linux");
    expect(windowsResult.status).toBe(0);
    expect(windowsResult.stdout).toContain("Desktop release artifacts validated for windows");
  });
});

function createDistRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-flow-release-"));
  tempDirs.push(dir);
  return dir;
}

function writeCliArtifacts(distRoot: string, platform: "macos" | "linux" | "windows"): void {
  const cliDir = path.join(distRoot, "cli", platform);
  fs.mkdirSync(cliDir, { recursive: true });
  const helperName = platform === "windows" ? "skill-flow-helper.exe" : "skill-flow-helper";
  const helperPath = path.join(cliDir, helperName);
  fs.writeFileSync(helperPath, platform === "windows" ? "binary" : "#!/usr/bin/env bash\nexit 0\n");
  if (platform !== "windows") {
    fs.chmodSync(helperPath, 0o755);
  }
  fs.writeFileSync(path.join(cliDir, "sha256.txt"), `${helperName}  deadbeef\n`);
}

function writeDesktopArtifacts(distRoot: string, platform: "macos" | "linux" | "windows", files: string[]): void {
  const desktopDir = path.join(distRoot, "desktop", platform);
  fs.mkdirSync(desktopDir, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(desktopDir, file), "artifact");
  }
  fs.writeFileSync(path.join(desktopDir, "sha256.txt"), "artifact  deadbeef\n");
}

function runValidate(platform: "macos" | "linux" | "windows", distRoot: string) {
  return spawnSync("bash", [validateScriptPath, platform], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SKILL_FLOW_RELEASE_DIST_ROOT: distRoot,
    },
    encoding: "utf8",
  });
}

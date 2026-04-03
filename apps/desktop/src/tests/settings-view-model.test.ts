import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { SettingsViewModel } from "../view-models/settings-view-model";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("settings view model", () => {
  it("writes settings through the shared state", () => {
    const state = createDesktopAppState();
    const viewModel = new SettingsViewModel(state);

    expect(viewModel.autoLaunch).toBe(false);

    viewModel.autoLaunch = true;

    expect(state.settings.autoLaunch).toBe(true);
    expect(viewModel.autoLaunch).toBe(true);
  });

  it("falls back to the latest releases page when no release has been fetched", () => {
    const opener = vi.fn();
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      releasePageOpener: opener,
    });

    viewModel.openReleasePage();

    expect(opener).toHaveBeenCalledWith(
      "https://github.com/VintLin/skill-flow/releases/latest",
    );
  });

  it("marks updates as available when the fetched version is newer", async () => {
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      updateChecker: {
        fetchLatestRelease: vi.fn().mockResolvedValue({
          version: "1.3.1",
          releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
        }),
      },
      currentVersionProvider: () => "1.1.0",
    });

    await viewModel.checkForUpdates();

    expect(viewModel.updateStatus).toBe("updateAvailable");
    expect(viewModel.latestVersion).toBe("1.3.1");
    expect(viewModel.releaseUrl).toBe(
      "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
    );
  });

  it("performs background update checking only once per view model instance", async () => {
    const fetchLatestRelease = vi.fn().mockResolvedValue({
      version: "1.1.0",
      releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.1.0",
    });
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      updateChecker: { fetchLatestRelease },
      currentVersionProvider: () => "1.1.0",
    });

    await viewModel.checkForUpdatesIfNeeded();
    await viewModel.checkForUpdatesIfNeeded();

    expect(fetchLatestRelease).toHaveBeenCalledTimes(1);
    expect(viewModel.updateStatus).toBe("upToDate");
  });

  it("restores the full desktop settings slice to defaults", () => {
    const state = createDesktopAppState({
      settings: {
        autoLaunch: true,
        logLevel: "error",
        experimentalExternalHelper: true,
        desktopLanguageRawValue: "ja",
        themeModeRawValue: "dark",
        themeAccentRawValue: "orange",
        homeCardDensityRawValue: "compact",
        menuCardDensityRawValue: "comfortable",
        selectedProjectScope: { kind: "project", projectId: "repo-a" },
        recentProjectScopes: [
          {
            projectId: "repo-a",
            title: "Repo A",
            lastActivityAt: "2026-04-03T00:00:00Z",
            tools: ["codex"],
          },
        ],
        agentDisplayPreferences: [{ targetId: "codex", isVisible: false, sortOrder: 0 }],
      },
    });
    const viewModel = new SettingsViewModel(state);

    viewModel.resetConfiguration();

    expect(state.settings).toEqual({
      autoLaunch: false,
      logLevel: "info",
      experimentalExternalHelper: false,
      desktopLanguageRawValue: "system",
      themeModeRawValue: "light",
      themeAccentRawValue: "blue",
      homeCardDensityRawValue: "comfortable",
      menuCardDensityRawValue: "compact",
      selectedProjectScope: { kind: "global" },
      recentProjectScopes: [],
      agentDisplayPreferences: [],
    });
  });

  it("removes catalog metadata cache files without deleting other state files", () => {
    const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-flow-desktop-settings-"));
    tempDirs.push(stateRoot);
    const catalogRoot = path.join(stateRoot, "catalog");
    fs.mkdirSync(catalogRoot, { recursive: true });
    const importDataPath = path.join(catalogRoot, "import-data.json");
    const sourceMetadataPath = path.join(catalogRoot, "source-metadata.json");
    const preferencesPath = path.join(stateRoot, "preferences.json");
    fs.writeFileSync(importDataPath, "{}");
    fs.writeFileSync(sourceMetadataPath, "{}");
    fs.writeFileSync(preferencesPath, "{}");
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      stateRootProvider: () => stateRoot,
    });

    viewModel.clearMetadataCache();

    expect(fs.existsSync(importDataPath)).toBe(false);
    expect(fs.existsSync(sourceMetadataPath)).toBe(false);
    expect(fs.existsSync(preferencesPath)).toBe(true);
  });
});

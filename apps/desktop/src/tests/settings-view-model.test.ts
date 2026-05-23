import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { SettingsViewModel } from "../view-models/settings-view-model";

function createSettingsStateSeed() {
  return {
    autoLaunch: true,
    logLevel: "warn",
    experimentalExternalHelper: true,
    desktopLanguageRawValue: "ja",
    themeModeRawValue: "dark",
    themeAccentRawValue: "green",
    homeCardDensityRawValue: "compact",
    menuCardDensityRawValue: "comfortable",
    selectedProjectScope: { kind: "global" } as const,
    recentProjectScopes: [],
    agentDisplayPreferences: [
      { targetId: "codex", isVisible: false, sortOrder: 0 },
      { targetId: "unknown", isVisible: true, sortOrder: 1 },
    ],
    customAgents: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
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

  it("marks the current app as a newer build when it is ahead of latest release", async () => {
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      updateChecker: {
        fetchLatestRelease: vi.fn().mockResolvedValue({
          version: "1.3.1",
          releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
        }),
      },
      currentVersionProvider: () => "1.4.0",
    });

    await viewModel.checkForUpdates();

    expect(viewModel.updateStatus).toBe("runningNewerBuild");
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

  it("loads, normalizes, and writes the full settings surface immediately", () => {
    const save = vi.fn();
    const store = {
      load: vi.fn(() => createSettingsStateSeed()),
      save,
    };
    const state = createDesktopAppState();
    const viewModel = new SettingsViewModel(state, { store } as never);

    expect(viewModel.autoLaunch).toBe(true);
    expect(viewModel.logLevel).toBe("warn");
    expect(viewModel.externalHelperOverride).toBe(true);
    expect(viewModel.desktopLanguage).toBe("ja");
    expect(viewModel.themeMode).toBe("dark");
    expect(viewModel.themeAccent).toBe("green");
    expect(state.settings.agentDisplayPreferences[0]?.targetId).toBe("codex");
    expect(state.settings.agentDisplayPreferences.find((row) => row.targetId === "unknown")).toBeUndefined();

    viewModel.autoLaunch = false;
    viewModel.logLevel = "error";

    expect(save).toHaveBeenCalled();
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoLaunch: false,
        logLevel: "error",
        experimentalExternalHelper: true,
        desktopLanguageRawValue: "ja",
        themeModeRawValue: "dark",
        themeAccentRawValue: "green",
        homeCardDensityRawValue: "compact",
        menuCardDensityRawValue: "comfortable",
      }),
    );
  });

  it("resets configuration back to full defaults", () => {
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
      customAgents: [],
    });
  });

  it("clears metadata cache through the Tauri maintenance boundary only", async () => {
    const clearMetadataCache = vi.fn().mockResolvedValue(undefined);
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      maintenance: { clearMetadataCache },
    });

    await viewModel.clearMetadataCache();

    expect(clearMetadataCache).toHaveBeenCalledTimes(1);
  });

  it("keeps custom agents in the unified detected agent list", () => {
    const state = createDesktopAppState();
    const viewModel = new SettingsViewModel(state);

    const result = viewModel.upsertCustomAgent({
      name: "My Agent",
      globalPath: "/Users/test/.my-agent/skills",
      projectPathTemplate: ".my-agent/skills",
      strategy: "copy",
    });

    expect(result).toEqual({});
    expect(state.settings.customAgents.map((agent) => agent.id)).toEqual(["my-agent"]);
    expect(viewModel.detectedAgentRows(["cursor"]).map((row) => row.targetId)).toEqual(["cursor", "my-agent"]);
    expect(viewModel.detectedAgentRows(["cursor"]).find((row) => row.targetId === "my-agent")).toEqual(
      expect.objectContaining({
        title: "My Agent",
        shortLabel: "MA",
        mountPath: "/Users/test/.my-agent/skills",
        projectPath: ".my-agent/skills",
        isBuiltIn: false,
      }),
    );
  });

  it("moves detected agents while preserving each target visibility", () => {
    const state = createDesktopAppState({
      settings: {
        agentDisplayPreferences: [
          { targetId: "claude-code", isVisible: true, sortOrder: 0 },
          { targetId: "codex", isVisible: false, sortOrder: 1 },
          { targetId: "cursor", isVisible: true, sortOrder: 2 },
        ],
      },
    });
    const viewModel = new SettingsViewModel(state);

    viewModel.moveAgents(1, 0, ["claude-code", "codex", "cursor"]);

    expect(state.settings.agentDisplayPreferences.slice(0, 3)).toEqual([
      { targetId: "codex", isVisible: false, sortOrder: 0 },
      { targetId: "claude-code", isVisible: true, sortOrder: 1 },
      { targetId: "cursor", isVisible: true, sortOrder: 2 },
    ]);
  });

  it("validates and deletes custom agents", () => {
    const state = createDesktopAppState();
    const viewModel = new SettingsViewModel(state);

    expect(viewModel.upsertCustomAgent({
      name: "",
      globalPath: "relative/path",
      projectPathTemplate: "/absolute/project/path",
      strategy: "copy",
    })).toEqual({
      name: "Name is required.",
      globalPath: "Global path must be absolute.",
      projectPathTemplate: "Project path must be relative.",
    });

    viewModel.upsertCustomAgent({
      name: "My Agent",
      globalPath: "/Users/test/.my-agent/skills",
      projectPathTemplate: ".my-agent/skills",
      strategy: "copy",
    });
    viewModel.deleteCustomAgent("my-agent");

    expect(state.settings.customAgents).toEqual([]);
    expect(state.settings.agentDisplayPreferences.some((preference) => preference.targetId === "my-agent")).toBe(false);
  });
});

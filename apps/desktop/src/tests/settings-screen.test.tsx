import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { SettingsScreen } from "../screens/settings-screen";
import { SettingsViewModel } from "../view-models/settings-view-model";

describe("settings screen", () => {
  it("renders settings fields, agent rows, and mount paths", () => {
    const state = createDesktopAppState({
      settings: {
        autoLaunch: true,
        logLevel: "debug",
        experimentalExternalHelper: true,
        desktopLanguageRawValue: "en",
        themeModeRawValue: "dark",
        themeAccentRawValue: "amber",
        homeCardDensityRawValue: "comfortable",
        menuCardDensityRawValue: "compact",
        agentDisplayPreferences: [
          { targetId: "codex", isVisible: true, sortOrder: 1 },
          { targetId: "claude-code", isVisible: false, sortOrder: 2 },
        ],
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <SettingsScreen viewModel={new SettingsViewModel(state)} />,
    );

    expect(markup).toContain("Settings");
    expect(markup).toContain("codex");
    expect(markup).toContain(".codex");
    expect(markup).toContain("debug");
    expect(markup).toContain("Auto Launch");
  });

  it("renders update checking state and release version details", () => {
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      updateChecker: {
        fetchLatestRelease: async () => ({
          version: "1.3.1",
          releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
        }),
      },
      currentVersionProvider: () => "1.1.0",
    });
    viewModel.hydrateUpdateState({
      status: "updateAvailable",
      latestVersion: "1.3.1",
      releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <SettingsScreen viewModel={viewModel} />,
    );

    expect(markup).toContain("Update Status");
    expect(markup).toContain("updateAvailable");
    expect(markup).toContain("Latest Version");
    expect(markup).toContain("1.3.1");
  });
});

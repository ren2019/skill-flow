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
});

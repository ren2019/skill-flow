import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { useRef, useState } from "react";
import { createDesktopAppState } from "../store/desktop-app-state";
import { SettingsScreen } from "../screens/settings-screen";
import { SettingsViewModel } from "../view-models/settings-view-model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("settings screen", () => {
  it("renders appearance, update, general, advanced, and maintenance sections", () => {
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
    expect(markup).toContain("Appearance");
    expect(markup).toContain("Application Update");
    expect(markup).toContain("Advanced");
    expect(markup).toContain("Maintenance");
  });

  it("renders update and maintenance actions instead of read-only fields only", () => {
    const state = createDesktopAppState({
      settings: {
        autoLaunch: true,
        logLevel: "debug",
        agentDisplayPreferences: [
          { targetId: "codex", isVisible: true, sortOrder: 1 },
        ],
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <SettingsScreen viewModel={new SettingsViewModel(state)} />,
    );

    expect(markup).toContain("Check for Updates");
    expect(markup).toContain("Open Releases");
    expect(markup).toContain("Clear Cache");
    expect(markup).toContain("Reset Configuration");
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
    expect(markup).toContain("Update available");
    expect(markup).toContain("Latest Version");
    expect(markup).toContain("1.3.1");
  });

  it("checks for updates on mount and rerenders the fetched status", async () => {
    const state = createDesktopAppState();
    let fetchCount = 0;

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new SettingsViewModel(state, {
          updateChecker: {
            fetchLatestRelease: async () => {
              fetchCount += 1;
              return {
                version: "1.3.1",
                releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
              };
            },
          },
          currentVersionProvider: () => "1.1.0",
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <SettingsScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Update Status");
    expect(text).toContain("Update available");
    expect(text).toContain("Latest Version");
    expect(text).toContain("1.3.1");
    expect(fetchCount).toBe(1);
  });

  it("renders localized update status labels", () => {
    const state = createDesktopAppState({
      settings: {
        desktopLanguageRawValue: "zh-Hans",
      },
    });
    const viewModel = new SettingsViewModel(state, {
      currentVersionProvider: () => "1.1.0",
    });
    viewModel.hydrateUpdateState({
      status: "updateAvailable",
      latestVersion: "1.3.1",
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <SettingsScreen viewModel={viewModel} />,
    );

    expect(markup).toContain("有可用更新");
  });
});

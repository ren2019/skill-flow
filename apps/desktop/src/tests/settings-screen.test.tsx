import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
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
        themeAccentRawValue: "purple",
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
    expect(markup).toContain("data-view=\"settings-page\"");
    expect(markup).toContain("data-view=\"settings-control-row\"");
    expect(markup).toContain("data-view=\"settings-agent-row\"");
    expect(markup).toContain("Appearance");
    expect(markup).toContain("Menu Bar");
    expect(markup).toContain("Application Update");
    expect(markup).toContain("Advanced");
    expect(markup).toContain("Maintenance");
    expect(markup).toContain("Standard");
    expect(markup).toContain("Compact");
    expect(markup).toContain("Configure which detected agents appear");
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
    expect(markup).toContain("data-view=\"settings-action-row\"");
  });

  it("wires agent visibility controls through the settings view model", async () => {
    const state = createDesktopAppState({
      settings: {
        agentDisplayPreferences: [
          { targetId: "codex", isVisible: true, sortOrder: 0 },
        ],
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new SettingsViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <SettingsScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-agent-visibility-target-id": "codex" }).props.onClick();
    });

    expect(state.settings.agentDisplayPreferences.find((row) => row.targetId === "codex")).toEqual({
      targetId: "codex",
      isVisible: false,
      sortOrder: 0,
    });
  });

  it("wires agent ordering controls through the settings view model", async () => {
    const state = createDesktopAppState({
      settings: {
        agentDisplayPreferences: [
          { targetId: "claude-code", isVisible: true, sortOrder: 0 },
          { targetId: "codex", isVisible: true, sortOrder: 1 },
        ],
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new SettingsViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <SettingsScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-move-agent-down-target-id": "claude-code" }).props.onClick();
    });

    expect(state.settings.agentDisplayPreferences.slice(0, 2)).toEqual([
      { targetId: "codex", isVisible: true, sortOrder: 0 },
      { targetId: "claude-code", isVisible: true, sortOrder: 1 },
    ]);
  });

  it("reorders agents by dragging the handle onto another agent row", async () => {
    const state = createDesktopAppState({
      settings: {
        agentDisplayPreferences: [
          { targetId: "claude-code", isVisible: true, sortOrder: 0 },
          { targetId: "codex", isVisible: true, sortOrder: 1 },
        ],
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new SettingsViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <SettingsScreen viewModel={viewModelRef.current} />;
    }

    const transferData: Record<string, string> = {};
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn((key: string, value: string) => {
        transferData[key] = value;
      }),
      getData: vi.fn((key: string) => transferData[key] ?? ""),
    };

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-agent-drag-handle-target-id": "codex" }).props.onDragStart({
        dataTransfer,
      });
    });
    const preventDefault = vi.fn();
    await act(async () => {
      renderer!.root.findByProps({ "data-agent-drop-target-id": "claude-code" }).props.onDragOver({
        preventDefault,
        dataTransfer,
      });
      renderer!.root.findByProps({ "data-agent-drop-target-id": "claude-code" }).props.onDrop({
        preventDefault,
        dataTransfer,
      });
    });

    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "codex");
    expect(preventDefault).toHaveBeenCalled();
    expect(state.settings.agentDisplayPreferences.slice(0, 2)).toEqual([
      { targetId: "codex", isVisible: true, sortOrder: 0 },
      { targetId: "claude-code", isVisible: true, sortOrder: 1 },
    ]);
  });

  it("adds, edits, validates, and deletes custom agents through the settings screen", async () => {
    const state = createDesktopAppState();

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new SettingsViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <SettingsScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-add-custom-agent": "true" }).props.onClick();
    });
    await act(async () => {
      renderer!.root.findByProps({ "data-save-custom-agent": "true" }).props.onClick();
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain("Name is required.");

    await act(async () => {
      renderer!.root.findByProps({ "data-custom-agent-field": "name" }).props.onChange({
        currentTarget: { value: "My Agent" },
      });
      renderer!.root.findByProps({ "data-custom-agent-field": "globalPath" }).props.onChange({
        currentTarget: { value: "/Users/test/.my-agent/skills" },
      });
      renderer!.root.findByProps({ "data-custom-agent-field": "projectPathTemplate" }).props.onChange({
        currentTarget: { value: ".my-agent/skills" },
      });
    });
    await act(async () => {
      renderer!.root.findByProps({ "data-save-custom-agent": "true" }).props.onClick();
    });
    expect(state.settings.customAgents).toEqual([
      expect.objectContaining({
        id: "my-agent",
        name: "My Agent",
        globalPath: "/Users/test/.my-agent/skills",
        projectPathTemplate: ".my-agent/skills",
      }),
    ]);

    await act(async () => {
      renderer!.root.findByProps({ "data-edit-custom-agent-id": "my-agent" }).props.onClick();
    });
    await act(async () => {
      renderer!.root.findByProps({ "data-custom-agent-field": "name" }).props.onChange({
        currentTarget: { value: "Team Agent" },
      });
    });
    await act(async () => {
      renderer!.root.findByProps({ "data-save-custom-agent": "true" }).props.onClick();
    });
    expect(state.settings.customAgents[0]).toEqual(
      expect.objectContaining({
        id: "my-agent",
        name: "Team Agent",
      }),
    );

    await act(async () => {
      renderer!.root.findByProps({ "data-delete-custom-agent-id": "my-agent" }).props.onClick();
    });
    expect(state.settings.customAgents).toEqual([]);
    expect(state.settings.agentDisplayPreferences.some((row) => row.targetId === "my-agent")).toBe(false);
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
    expect(markup).toContain("data-view=\"settings-update-status\"");
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

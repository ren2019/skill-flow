import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { HomeViewModel } from "../view-models/home-view-model";
import { MenuQuickConfigScreen } from "../screens/menu-quick-config-screen";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("menu quick config screen", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders searchable menu cards without applying the home tag filter", async () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta"],
        selectedHomeTagFilterId: "official",
        customTagsBySourceId: {
          alpha: [{ id: "official", title: "Official" }],
          beta: [{ id: "community", title: "Community" }],
        },
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 1,
            targets: [{ id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true }],
            skills: [{ id: "browse", title: "Browse", isEnabled: true }],
            skillSelection: "full",
            targetSelection: "full",
          },
          {
            sourceId: "beta",
            title: "Beta Tools",
            locator: "obra/beta",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 0,
            activeTargetCount: 0,
          },
        ],
      },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });
    const updateSelection = vi.fn(async () => undefined);
    const viewModel = new HomeViewModel(state, { updateSelection });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<MenuQuickConfigScreen viewModel={viewModel} />);
    });

    expect(renderer!.root.findAllByProps({ "data-view": "menu-quick-config" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-card-display-mode": "menuCompact" })).toHaveLength(2);
    expect(renderer!.root.findAllByProps({ "data-view": "shared-group-card-stats" })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);

    await act(async () => {
      renderer!.root.findByProps({ "data-menu-search-input": "true" }).props.onChange({
        currentTarget: { value: "Beta" },
      });
    });

    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);
  });

  it("routes footer actions and card toggles through the home view model", async () => {
    vi.useFakeTimers();
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha"],
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 1,
            targets: [{ id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true }],
            skills: [{ id: "browse", title: "Browse", isEnabled: true }],
            skillSelection: "full",
            targetSelection: "full",
          },
        ],
      },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });
    const updateSelection = vi.fn(async () => undefined);
    const viewModel = new HomeViewModel(state, { updateSelection });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<MenuQuickConfigScreen viewModel={viewModel} />);
    });

    expect(renderer!.root.findAllByProps({ "data-skill-toggle-id": "alpha:browse" })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ "data-view": "shared-group-card-skills" })).toHaveLength(0);
    await act(async () => {
      renderer!.root.findByProps({ "data-menu-card-shell": "alpha" }).props.onMouseEnter();
    });
    expect(renderer!.root.findAllByProps({ "data-skill-toggle-id": "alpha:browse" })).toHaveLength(0);
    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(renderer!.root.findAllByProps({ "data-skill-toggle-id": "alpha:browse" })).toHaveLength(0);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(renderer!.root.findAllByProps({ "data-view": "shared-group-card-skills" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-skill-toggle-id": "alpha:browse" })).toHaveLength(1);

    await act(async () => {
      renderer!.root.findByProps({ "data-skill-toggle-id": "alpha:browse" }).props.onClick();
    });
    expect(updateSelection).toHaveBeenCalledWith("alpha", {
      selectedSkillIds: [],
      enabledTargetIds: ["codex"],
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-menu-import": "true" }).props.onClick();
    });
    expect(state.view.currentRoute).toEqual({ kind: "importPage" });

    await act(async () => {
      renderer!.update(<MenuQuickConfigScreen viewModel={viewModel} />);
      renderer!.root.findByProps({ "data-menu-settings": "true" }).props.onClick();
    });
    expect(state.view.currentRoute).toEqual({ kind: "settings" });
  });
});

import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { createDesktopAppState } from "../store/desktop-app-state";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("app", () => {
  it("bootstraps home from bridge-backed inventory and keeps the selected source in shared state", async () => {
    const refreshInventory = vi.fn(async () => {
      state.workspace.sourceIds = ["alpha", "beta"];
      state.workspace.inventorySummaries = [
        {
          sourceId: "alpha",
          title: "Alpha Starter",
          locator: "obra/alpha",
          health: "HEALTHY",
          warningCount: 0,
          errorCount: 0,
          skillCount: 2,
          enabledSkillCount: 1,
          activeTargetCount: 1,
        },
      ];
    });
    const state = createDesktopAppState({
      asyncResources: {
        homeBootstrapPhase: { kind: "idle" },
      },
    });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<App state={state} integration={{ refreshInventory }} />);
    });

    expect(refreshInventory).toHaveBeenCalledTimes(1);
    expect(state.workspace.sourceIds).toEqual(["alpha", "beta"]);
    expect(state.view.selectedSourceId).toBe("alpha");
    expect(state.asyncResources.homeBootstrapPhase).toEqual({ kind: "ready" });
    expect(JSON.stringify(renderer!.toJSON())).toContain("Alpha Starter");
  });

  it("rerenders the shell when home navigation opens a detail route", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: [],
            fileTree: [],
            groupDocuments: [],
            targets: [],
            skills: [],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "empty",
            targetSelection: "empty",
          },
        },
      },
    });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<App state={state} />);
    });

    const openButton = renderer!.root.findByProps({ "data-source-id": "alpha" });
    await act(async () => {
      openButton.props.onClick();
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Source Detail");
    expect(text).toContain("Alpha");
    expect(text).toContain("Current route");
    expect(text).toContain("Detail");
  });

  it("preserves selected source and visible cards when home route round-trips through detail and import", async () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta"],
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 3,
            enabledSkillCount: 2,
            activeTargetCount: 2,
          },
          {
            sourceId: "beta",
            title: "Beta Tools",
            locator: "obra/beta",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 2,
            enabledSkillCount: 1,
            activeTargetCount: 1,
          },
        ],
      },
      view: {
        selectedSourceId: "beta",
      },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
      detailState: {
        detailsBySourceId: {
          beta: {
            sourceId: "beta",
            title: "Beta Tools",
            enabledTargetLabels: [],
            fileTree: [],
            groupDocuments: [],
            targets: [],
            skills: [],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "empty",
            targetSelection: "empty",
          },
        },
      },
    });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<App state={state} />);
    });

    const openButton = renderer!.root.findByProps({ "data-source-id": "beta" });
    await act(async () => {
      openButton.props.onClick();
    });
    expect(state.view.selectedSourceId).toBe("beta");

    await act(async () => {
      state.view.currentRoute = { kind: "importPage" };
      renderer!.update(<App state={state} />);
    });
    expect(state.view.selectedSourceId).toBe("beta");

    await act(async () => {
      state.view.currentRoute = { kind: "home" };
      renderer!.update(<App state={state} />);
    });

    expect(state.view.selectedSourceId).toBe("beta");
    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);
  });
});

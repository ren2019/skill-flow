import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { desktopRoute } from "../navigation/desktop-route";
import { MainViewModel } from "../view-models/main-view-model";

describe("main view model", () => {
  it("navigates the shared desktop route state", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
    });
    const viewModel = new MainViewModel(state);

    expect(viewModel.currentRoute).toEqual(desktopRoute.home());

    viewModel.showDetail("alpha");
    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(state.view.selectedSourceId).toBe("alpha");
    expect(viewModel.currentRoute).toEqual(desktopRoute.detail("alpha"));

    viewModel.showDetail("   ");
    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(state.view.selectedSourceId).toBe("alpha");

    viewModel.showImportPage();
    expect(state.view.currentRoute).toEqual(desktopRoute.importPage());

    viewModel.showSettings();
    expect(state.view.currentRoute).toEqual(desktopRoute.settings());

    viewModel.showHome();
    expect(state.view.currentRoute).toEqual(desktopRoute.home());
  });

  it("tracks bound route changes from shared state without extra hooks", () => {
    const state = createDesktopAppState();
    const viewModel = new MainViewModel(state);

    state.view.currentRoute = desktopRoute.detail("alpha");
    expect(viewModel.currentRoute).toEqual(desktopRoute.detail("alpha"));

    state.view.currentRoute = desktopRoute.importPage();
    expect(viewModel.currentRoute).toEqual(desktopRoute.importPage());
  });

  it("keeps the selected source id when navigating away from detail routes", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });
    const viewModel = new MainViewModel(state);

    viewModel.showHome();
    expect(state.view.currentRoute).toEqual(desktopRoute.home());
    expect(state.view.selectedSourceId).toBe("alpha");

    viewModel.showImportPage();
    expect(state.view.currentRoute).toEqual(desktopRoute.importPage());
    expect(state.view.selectedSourceId).toBe("alpha");
  });

  it("derives settings agent rows from detected inventory and detail targets in catalog order", () => {
    const state = createDesktopAppState({
      settings: {
        customAgents: [
          {
            id: "team-agent",
            name: "Team Agent",
            globalPath: "/Users/test/.team-agent/skills",
            projectPathTemplate: ".team-agent/skills",
            strategy: "symlink",
            createdAt: "2026-05-23T00:00:00.000Z",
            updatedAt: "2026-05-23T00:00:00.000Z",
          },
        ],
      },
      workspace: {
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha",
            locator: "local/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 2,
            targets: [
              { id: "cursor", label: "Cursor", shortLabel: "CU", isEnabled: true },
              { id: "team-agent", label: "Team Agent", shortLabel: "TA", isEnabled: true },
            ],
          },
        ],
      },
      detailState: {
        detailsBySourceId: {
          beta: {
            sourceId: "beta",
            title: "Beta",
            enabledTargetLabels: [],
            fileTree: [],
            groupDocuments: [],
            targets: [
              { id: "claude-code", label: "Claude Code", shortLabel: "CC", isEnabled: true },
            ],
            skills: [],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "empty",
            targetSelection: "empty",
          },
        },
      },
    });
    const viewModel = new MainViewModel(state);

    expect(viewModel.detectedTargetIdsForSettings).toEqual([
      "claude-code",
      "cursor",
      "team-agent",
    ]);
  });
});

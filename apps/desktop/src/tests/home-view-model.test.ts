import { describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { desktopRoute } from "../navigation/desktop-route";
import { HomeViewModel } from "../view-models/home-view-model";

describe("home view model", () => {
  it("refresh rewrites inventory summaries without clearing valid home selection", async () => {
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
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 1,
          },
        ],
      },
      view: {
        selectedSourceId: "beta",
      },
    });
    const viewModel = new HomeViewModel(state, {
      refreshList: vi.fn(async () => {
        state.workspace.sourceIds = ["beta", "gamma"];
        state.workspace.inventorySummaries = [
          {
            sourceId: "beta",
            title: "Beta Tools",
            locator: "obra/beta",
            health: "PARTIAL",
            warningCount: 1,
            errorCount: 0,
            skillCount: 2,
            enabledSkillCount: 1,
            activeTargetCount: 1,
          },
        ];
      }),
    });

    await viewModel.refresh();

    expect(state.view.selectedSourceId).toBe("beta");
    expect(viewModel.inventoryCards).toEqual([
      expect.objectContaining({
        sourceId: "beta",
        title: "Beta Tools",
      }),
    ]);
  });

  it("projects the shared route state and workspace source ids", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"] },
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });

    const viewModel = new HomeViewModel(state);

    expect(viewModel.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(viewModel.sourceIds).toEqual(["alpha", "beta"]);

    state.workspace.sourceIds.push("gamma");
    expect(viewModel.sourceIds).toEqual(["alpha", "beta", "gamma"]);
  });

  it("refreshes and updates all non-empty groups from home", async () => {
    const refreshList = vi.fn().mockResolvedValue(undefined);
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "", "beta"] },
    });
    const viewModel = new HomeViewModel(state, {
      refreshList,
      updateGroup,
    });

    await viewModel.refresh();
    await viewModel.updateAllGroupsFromHome();

    expect(refreshList).toHaveBeenCalledTimes(1);
    expect(updateGroup.mock.calls).toEqual([["alpha"], ["beta"]]);
  });

  it("updates the current group using only the current selected source", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta", "gamma"] },
      view: {
        selectedSourceId: "beta",
      },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    await viewModel.updateCurrentGroup();

    expect(updateGroup.mock.calls).toEqual([["beta"]]);
  });

  it("updates every non-empty source in home order", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["beta", "", "alpha", "gamma"] },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    await viewModel.updateAllGroupsFromHome();

    expect(updateGroup.mock.calls).toEqual([["beta"], ["alpha"], ["gamma"]]);
  });

  it("updates only the selected group and keeps pin state in shared state", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"], pinnedSourceIds: ["beta"] },
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    await viewModel.updateCurrentGroup();
    await viewModel.togglePinned("alpha");
    await viewModel.togglePinned("beta");

    expect(updateGroup).toHaveBeenCalledWith("alpha");
    expect(state.workspace.pinnedSourceIds).toEqual(["alpha"]);
    expect(viewModel.isPinned("alpha")).toBe(true);
    expect(viewModel.isPinned("beta")).toBe(false);
    expect(viewModel.toastMessage).toBe("Updated 1 group.");
  });

  it("uses the persisted pin list returned by the runtime", async () => {
    const togglePinnedSource = vi.fn().mockResolvedValue(["beta", "alpha"]);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"], pinnedSourceIds: ["beta"] },
    });
    const viewModel = new HomeViewModel(state, { togglePinnedSource });

    await viewModel.togglePinned("alpha");

    expect(togglePinnedSource).toHaveBeenCalledWith("alpha");
    expect(state.workspace.pinnedSourceIds).toEqual(["beta", "alpha"]);
  });

  it("rolls back optimistic pin changes when persistence fails", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"], pinnedSourceIds: ["beta"] },
    });
    const viewModel = new HomeViewModel(state, {
      togglePinnedSource: vi.fn().mockRejectedValue(new Error("pin failed")),
    });

    await viewModel.togglePinned("alpha");

    expect(state.workspace.pinnedSourceIds).toEqual(["beta"]);
    expect(viewModel.toastMessage).toBe("Pin failed: pin failed");
  });

  it("shows a plural success toast after updating all groups from home", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "", "beta"] },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    await viewModel.updateAllGroupsFromHome();

    expect(updateGroup.mock.calls).toEqual([["alpha"], ["beta"]]);
    expect(viewModel.toastMessage).toBe("Updated 2 groups.");
  });

  it("shows a neutral toast when there are no groups to update", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const viewModel = new HomeViewModel(createDesktopAppState(), { updateGroup });

    await viewModel.updateAllGroupsFromHome();

    expect(updateGroup).not.toHaveBeenCalled();
    expect(viewModel.toastMessage).toBe("No groups to update.");
  });

  it("summarizes detailed update results like the macOS workflow", async () => {
    const updateGroups = vi.fn().mockResolvedValue({
      updated: [
        { sourceId: "alpha", changed: true },
        { sourceId: "beta", changed: false },
        { sourceId: "gamma", changed: true, invalidatedLeafIds: ["gamma:review"] },
      ],
    });
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta", "gamma"] },
    });
    const viewModel = new HomeViewModel(state, { updateGroups });

    await viewModel.updateAllGroupsFromHome();

    expect(updateGroups).toHaveBeenCalledWith(["alpha", "beta", "gamma"]);
    expect(viewModel.toastMessage).toBe("Updated 1 · Up to date 1 · Needs review 1");
  });

  it("records an error toast when update-current runs without a selection", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"] },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    const didUpdate = await viewModel.updateCurrentGroup();

    expect(didUpdate).toBe(false);
    expect(updateGroup).not.toHaveBeenCalled();
    expect(viewModel.toastMessage).toBe("Update failed: no group selected.");
  });

  it("localizes generated home toast messages for zh-Hans", async () => {
    const state = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      workspace: { sourceIds: ["alpha"] },
    });
    const viewModel = new HomeViewModel(state);

    const didUpdate = await viewModel.updateCurrentGroup();

    expect(didUpdate).toBe(false);
    expect(viewModel.toastMessage).toBe("更新失败：未选择分组。");
  });

  it("localizes update success toasts for zh-Hans", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      workspace: { sourceIds: ["alpha", "beta"] },
      view: { selectedSourceId: "alpha" },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    await viewModel.updateCurrentGroup();
    expect(viewModel.toastMessage).toBe("已更新 1 个分组。");

    await viewModel.updateAllGroupsFromHome();
    expect(viewModel.toastMessage).toBe("已更新 2 个分组。");
  });

  it("records an error toast when refresh fails", async () => {
    const viewModel = new HomeViewModel(createDesktopAppState(), {
      refreshList: vi.fn().mockRejectedValue(new Error("refresh failed")),
    });

    await viewModel.refresh();

    expect(viewModel.toastMessage).toBe("refresh failed");
  });

  it("records an error toast when group updates fail", async () => {
    const viewModel = new HomeViewModel(
      createDesktopAppState({
        workspace: { sourceIds: ["alpha"] },
        view: { selectedSourceId: "alpha" },
      }),
      {
        updateGroup: vi.fn().mockRejectedValue(new Error("update failed")),
      },
    );

    await viewModel.updateCurrentGroup();

    expect(viewModel.toastMessage).toBe("Update failed: update failed");
  });

  it("deletes a source through the runtime and clears local detail state", async () => {
    const deleteSource = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta"],
        pinnedSourceIds: ["alpha"],
        customTagsBySourceId: {
          alpha: [{ id: "official", title: "Official" }],
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
          },
          {
            sourceId: "beta",
            title: "Beta Tools",
            locator: "obra/beta",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 1,
          },
        ],
      },
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha Starter",
            skillSelection: "full",
            targetSelection: "empty",
            enabledTargetLabels: [],
            sourceFacts: [],
            deploymentFacts: [],
            fileTree: [],
            groupDocuments: [],
            targets: [],
            skills: [{ id: "alpha:browse", title: "Browse", isEnabled: true, documents: [] }],
          },
        },
        ui: {
          selectedSkillIdByGroup: { alpha: "alpha:browse" },
          showsGroupOverviewByGroup: { alpha: false },
          selectedTreeItemIdByGroup: { alpha: "alpha:browse" },
          selectedGroupDocumentIdByGroup: { alpha: "alpha:overview" },
          selectedSkillDocumentIdBySkill: { "alpha:browse": "alpha:browse:skill-doc" },
        },
      },
    });
    const viewModel = new HomeViewModel(state, {
      deleteSource,
      refreshList: vi.fn().mockResolvedValue(undefined),
    });

    await viewModel.deleteSource("alpha");

    expect(deleteSource).toHaveBeenCalledWith("alpha");
    expect(state.workspace.sourceIds).toEqual(["beta"]);
    expect(state.workspace.pinnedSourceIds).toEqual([]);
    expect(state.workspace.customTagsBySourceId.alpha).toBeUndefined();
    expect(state.detailState.detailsBySourceId.alpha).toBeUndefined();
    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBeUndefined();
    expect(state.detailState.ui.selectedSkillDocumentIdBySkill["alpha:browse"]).toBeUndefined();
    expect(state.view.currentRoute).toEqual(desktopRoute.home());
    expect(state.view.selectedSourceId).toBe("beta");
    expect(viewModel.toastMessage).toBe("Removed alpha.");
  });

  it("records a localized toast when delete runs without a source id", async () => {
    const state = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
    });
    const deleteSource = vi.fn().mockResolvedValue(undefined);
    const viewModel = new HomeViewModel(state, { deleteSource });

    await viewModel.deleteSource("  ");

    expect(deleteSource).not.toHaveBeenCalled();
    expect(viewModel.toastMessage).toBe("卸载失败：未选择分组。");
  });

  it("records an error toast when delete fails", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"], pinnedSourceIds: ["alpha"] },
    });
    const viewModel = new HomeViewModel(state, {
      deleteSource: vi.fn().mockRejectedValue(new Error("delete failed")),
    });

    await viewModel.deleteSource("alpha");

    expect(state.workspace.sourceIds).toEqual(["alpha"]);
    expect(state.workspace.pinnedSourceIds).toEqual(["alpha"]);
    expect(viewModel.toastMessage).toBe("Uninstall failed: delete failed");
  });

  it("persists home card skill and target toggles through the shared apply path", async () => {
    const updateSelection = vi.fn().mockResolvedValue(undefined);
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
            skillCount: 2,
            enabledSkillCount: 1,
            activeTargetCount: 0,
            skillSelection: "partial",
            targetSelection: "empty",
            skills: [
              { id: "alpha:browse", title: "browse", isEnabled: true },
              { id: "alpha:review", title: "review", isEnabled: false },
            ],
            targets: [
              { id: "codex", label: "Codex", shortLabel: "CX", isEnabled: false },
            ],
          },
        ],
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha Starter",
            enabledTargetLabels: [],
            fileTree: [],
            groupDocuments: [],
            targets: [{ id: "codex", label: "Codex", isEnabled: false }],
            skills: [
              { id: "alpha:browse", title: "browse", isEnabled: true, documents: [] },
              { id: "alpha:review", title: "review", isEnabled: false, documents: [] },
            ],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "partial",
            targetSelection: "empty",
          },
        },
      },
    });
    const viewModel = new HomeViewModel(state, { updateSelection });

    await viewModel.toggleCardSkill("alpha", "alpha:review");
    await viewModel.toggleCardTarget("alpha", "codex");

    expect(updateSelection.mock.calls).toEqual([
      ["alpha", {
        selectedSkillIds: ["alpha:browse", "alpha:review"],
        enabledTargetIds: [],
      }],
      ["alpha", {
        selectedSkillIds: ["alpha:browse", "alpha:review"],
        enabledTargetIds: ["codex"],
      }],
    ]);
    expect(state.workspace.inventorySummaries[0]).toEqual(
      expect.objectContaining({
        enabledSkillCount: 2,
        activeTargetCount: 1,
        selectedSkillNames: ["browse", "review"],
        enabledTargetLabels: ["Codex"],
        skillSelection: "full",
        targetSelection: "full",
      }),
    );
    expect(state.detailState.detailsBySourceId.alpha.skillSelection).toBe("full");
    expect(state.detailState.detailsBySourceId.alpha.targetSelection).toBe("full");
  });

  it("rolls back home card selection when apply persistence fails", async () => {
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
            activeTargetCount: 0,
            skillSelection: "full",
            targetSelection: "empty",
            skills: [{ id: "alpha:browse", title: "browse", isEnabled: true }],
            targets: [],
          },
        ],
      },
    });
    const viewModel = new HomeViewModel(state, {
      updateSelection: vi.fn().mockRejectedValue(new Error("apply failed")),
    });

    await viewModel.toggleCardSkill("alpha", "alpha:browse");

    expect(state.workspace.inventorySummaries[0].skills).toEqual([
      { id: "alpha:browse", title: "browse", isEnabled: true },
    ]);
    expect(state.workspace.inventorySummaries[0].skillSelection).toBe("full");
    expect(viewModel.toastMessage).toBe("apply failed");
  });

  it("clears a previous toast after a later successful action", async () => {
    const refreshList = vi
      .fn()
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockResolvedValueOnce(undefined);
    const viewModel = new HomeViewModel(createDesktopAppState(), {
      refreshList,
    });

    await viewModel.refresh();
    expect(viewModel.toastMessage).toBe("refresh failed");

    await viewModel.refresh();
    expect(viewModel.toastMessage).toBeUndefined();
  });

  it("shows the same loading and toast transitions as the macOS home workflow", async () => {
    const state = createDesktopAppState({
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });
    let phaseDuringRefresh = state.asyncResources.homeBootstrapPhase.kind;
    const viewModel = new HomeViewModel(state, {
      refreshList: vi.fn(async () => {
        phaseDuringRefresh = state.asyncResources.homeBootstrapPhase.kind;
      }),
    });

    await viewModel.refresh();

    expect(phaseDuringRefresh).toBe("loading");
    expect(state.asyncResources.homeBootstrapPhase).toEqual({ kind: "ready" });
    expect(viewModel.toastMessage).toBeUndefined();
  });

  it("switches project scope through shared settings state", async () => {
    const persistSettings = vi.fn();
    const state = createDesktopAppState({
      settings: {
        recentProjectScopes: [
          {
            projectId: "repo-a",
            title: "Repo A",
            lastActivityAt: "2026-04-02T10:00:00Z",
            tools: ["codex"],
          },
        ],
      },
    });
    const viewModel = new HomeViewModel(state, { persistSettings });

    await viewModel.selectProjectScope({ kind: "project", projectId: "repo-a" });

    expect(state.settings.selectedProjectScope).toEqual({
      kind: "project",
      projectId: "repo-a",
    });
    expect(viewModel.toastMessage).toBe("Switched to Repo A.");
    expect(persistSettings).toHaveBeenCalledTimes(1);

    await viewModel.selectProjectScope({ kind: "global" });

    expect(state.settings.selectedProjectScope).toEqual({ kind: "global" });
    expect(viewModel.toastMessage).toBe("Switched to Global.");
    expect(persistSettings).toHaveBeenCalledTimes(2);
  });

  it("normalizes unknown project scopes back to global without rewriting unchanged settings", async () => {
    const persistSettings = vi.fn();
    const state = createDesktopAppState({
      settings: {
        selectedProjectScope: { kind: "global" },
        recentProjectScopes: [
          {
            projectId: "repo-a",
            title: "Repo A",
            lastActivityAt: "2026-04-02T10:00:00Z",
            tools: ["codex"],
          },
        ],
      },
    });
    const viewModel = new HomeViewModel(state, { persistSettings });

    await viewModel.selectProjectScope({ kind: "project", projectId: "missing" });

    expect(state.settings.selectedProjectScope).toEqual({ kind: "global" });
    expect(persistSettings).not.toHaveBeenCalled();
    expect(viewModel.toastMessage).toBeUndefined();
  });

  it("normalizes source ids before opening detail routes", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.home(),
      },
    });
    const viewModel = new HomeViewModel(state);

    viewModel.openDetail("  alpha  ");

    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(state.view.selectedSourceId).toBe("alpha");

    viewModel.openDetail("   ");

    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(state.view.selectedSourceId).toBe("alpha");
  });

  it("localizes project scope switch toasts for zh-Hans", async () => {
    const state = createDesktopAppState({
      settings: {
        desktopLanguageRawValue: "zh-Hans",
        recentProjectScopes: [
          {
            projectId: "repo-a",
            title: "仓库 A",
            lastActivityAt: "2026-04-02T10:00:00Z",
            tools: ["codex"],
          },
        ],
      },
    });
    const viewModel = new HomeViewModel(state);

    await viewModel.selectProjectScope({ kind: "project", projectId: "repo-a" });

    expect(viewModel.toastMessage).toBe("已切换到仓库 A。");
  });

  it("projects inventory cards from shared workflow summaries", () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha"],
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 1,
            errorCount: 0,
            skillCount: 3,
            enabledSkillCount: 2,
            activeTargetCount: 2,
            byline: "by obra",
            enabledTargetLabels: ["Codex", "Claude Code"],
            selectedSkillNames: ["browse", "review"],
          },
        ],
      },
    });

    const viewModel = new HomeViewModel(state);

    expect(viewModel.inventoryCards).toEqual([
      expect.objectContaining({
        sourceId: "alpha",
        title: "Alpha Starter",
        locator: "obra/alpha",
        byline: "by obra",
        skillCount: 3,
        enabledTargetLabels: ["Codex", "Claude Code"],
        selectedSkillNames: ["browse", "review"],
      }),
    ]);
  });

  it("filters inventory cards by selected home tag", () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta"],
        customTagsBySourceId: {
          alpha: [{ id: "official", title: "Official" }],
          beta: [{ id: "community", title: "Community" }],
        },
        selectedHomeTagFilterId: "official",
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
    });

    const viewModel = new HomeViewModel(state);

    expect(viewModel.inventoryCards.map((card) => card.sourceId)).toEqual(["alpha"]);
  });

  it("aggregates home tag counts by source coverage", () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta", "gamma"],
        customTagsBySourceId: {
          alpha: [{ id: "official", title: "Official" }],
          beta: [{ id: "official", title: "Official" }, { id: "community", title: "Community" }],
        },
      },
    });

    const viewModel = new HomeViewModel(state);

    expect(viewModel.homeTagCountById).toEqual({
      official: 2,
      community: 1,
    });
  });

  it("derives home tags from bundled recommendations when no custom tags exist", () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["garrytan-gstack", "plain-local"],
        inventorySummaries: [
          {
            sourceId: "garrytan-gstack",
            title: "gstack",
            locator: "https://github.com/garrytan/gstack/",
            repoUrl: "https://github.com/garrytan/gstack",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 3,
            enabledSkillCount: 2,
            activeTargetCount: 2,
          },
          {
            sourceId: "plain-local",
            title: "Local Only",
            locator: "/tmp/plain-local",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 0,
          },
        ],
      },
    });

    const viewModel = new HomeViewModel(state);

    expect(viewModel.homeTagFilters).toEqual([
      expect.objectContaining({ id: "preset:development", title: "Development" }),
      expect.objectContaining({ id: "preset:teamwork", title: "Teamwork" }),
    ]);
    expect(viewModel.homeTagCountById).toEqual({
      "preset:development": 1,
      "preset:teamwork": 1,
    });
    expect(viewModel.inventoryTags("garrytan-gstack")).toEqual([
      expect.objectContaining({ id: "preset:development", title: "Development" }),
      expect.objectContaining({ id: "preset:teamwork", title: "Teamwork" }),
    ]);
    expect(viewModel.inventoryTags("plain-local")).toEqual([]);
  });
});

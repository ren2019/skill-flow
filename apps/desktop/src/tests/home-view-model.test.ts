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
    viewModel.togglePinned("alpha");
    viewModel.togglePinned("beta");

    expect(updateGroup).toHaveBeenCalledWith("alpha");
    expect(state.workspace.pinnedSourceIds).toEqual(["alpha"]);
    expect(viewModel.isPinned("alpha")).toBe(true);
    expect(viewModel.isPinned("beta")).toBe(false);
    expect(viewModel.toastMessage).toBe("Updated 1 group.");
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

  it("records an error toast when update-current runs without a selection", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"] },
    });
    const viewModel = new HomeViewModel(state, { updateGroup });

    const didUpdate = await viewModel.updateCurrentGroup();

    expect(didUpdate).toBe(false);
    expect(updateGroup).not.toHaveBeenCalled();
    expect(viewModel.toastMessage).toBe("No group selected.");
  });

  it("localizes generated home toast messages for zh-Hans", async () => {
    const state = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      workspace: { sourceIds: ["alpha"] },
    });
    const viewModel = new HomeViewModel(state);

    const didUpdate = await viewModel.updateCurrentGroup();

    expect(didUpdate).toBe(false);
    expect(viewModel.toastMessage).toBe("未选择分组。");
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

    expect(viewModel.toastMessage).toBe("update failed");
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
    const viewModel = new HomeViewModel(state);

    await viewModel.selectProjectScope({ kind: "project", projectId: "repo-a" });

    expect(state.settings.selectedProjectScope).toEqual({
      kind: "project",
      projectId: "repo-a",
    });
    expect(viewModel.toastMessage).toBe("Switched to Repo A.");

    await viewModel.selectProjectScope({ kind: "global" });

    expect(state.settings.selectedProjectScope).toEqual({ kind: "global" });
    expect(viewModel.toastMessage).toBe("Switched to Global.");
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

import { describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { ImportViewModel } from "../view-models/import-view-model";

describe("import view model", () => {
  it("projects the shared route state and drafts", () => {
    const state = createDesktopAppState();
    state.importState.draftsByItemId.alpha = {
      selectedSkillIds: ["skill-a"],
      enabledTargetIds: ["target-a"],
    };

    const viewModel = new ImportViewModel(state);

    expect(viewModel.currentRoute).toEqual(state.view.currentRoute);
    expect(viewModel.draftsByItemId).toEqual({
      alpha: {
        selectedSkillIds: ["skill-a"],
        enabledTargetIds: ["target-a"],
      },
    });
    expect("mutationLane" in viewModel).toBe(false);
  });

  it("splits recommended and search content by submitted query", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            categoryId: "development",
            categoryTitle: "Development",
            recommendationDescription: "Development starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
        searchGroups: [
          {
            id: "search-result",
            title: "Search Result",
            locator: "openai/result",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-b", selectedByDefault: true }],
            targets: [{ id: "claude-code", selectedByDefault: true }],
          },
        ],
      },
    });

    const viewModel = new ImportViewModel(state);

    expect(viewModel.content).toEqual({
      kind: "recommended",
      sections: [
        {
          categoryId: "development",
          title: "Development",
          groups: [
            expect.objectContaining({
              id: "starter",
              recommendationDescription: "Development starter",
            }),
          ],
        },
      ],
    });

    state.importState.importSubmittedQuery = "openai";

    expect(viewModel.content).toEqual({
      kind: "searchResults",
      groups: [
        expect.objectContaining({
          id: "search-result",
          title: "Search Result",
        }),
      ],
    });
  });

  it("loads local recommendations without triggering search", async () => {
    const searchLoader = vi.fn();
    const recommendationsLoader = vi.fn().mockReturnValue([
      {
        id: "starter",
        title: "Starter",
        locator: "obra/starter",
        categoryId: "development",
        categoryTitle: "Development",
      },
    ]);
    const viewModel = new ImportViewModel(createDesktopAppState(), {
      recommendationsLoader,
      searchLoader,
    });

    await viewModel.loadImportPageIfNeeded();

    expect(recommendationsLoader).toHaveBeenCalledTimes(1);
    expect(searchLoader).not.toHaveBeenCalled();
    expect(viewModel.importSubmittedQuery).toBe("");
    expect(viewModel.searchPhase).toEqual({ kind: "ready" });
    expect(viewModel.content).toEqual({
      kind: "recommended",
      sections: [
        {
          categoryId: "development",
          title: "Development",
          groups: [
            expect.objectContaining({
              id: "starter",
            }),
          ],
        },
      ],
    });
  });

  it("preserves recommendation section order from the local seed list", async () => {
    const viewModel = new ImportViewModel(createDesktopAppState(), {
      recommendationsLoader: () => [
        {
          id: "alpha",
          title: "Alpha",
          locator: "obra/alpha",
          categoryId: "general",
          categoryTitle: "General",
        },
        {
          id: "beta",
          title: "Beta",
          locator: "obra/beta",
          categoryId: "development",
          categoryTitle: "Development",
        },
        {
          id: "gamma",
          title: "Gamma",
          locator: "obra/gamma",
          categoryId: "general",
          categoryTitle: "General",
        },
      ],
    });

    await viewModel.loadImportPageIfNeeded();

    expect(viewModel.content).toEqual({
      kind: "recommended",
      sections: [
        {
          categoryId: "general",
          title: "General",
          groups: [
            expect.objectContaining({ id: "alpha" }),
            expect.objectContaining({ id: "gamma" }),
          ],
        },
        {
          categoryId: "development",
          title: "Development",
          groups: [
            expect.objectContaining({ id: "beta" }),
          ],
        },
      ],
    });
  });

  it("previews a group only once after it resolves", async () => {
    const previewLoader = vi.fn().mockResolvedValue({
      skills: [
        { id: "skill-a", selectedByDefault: true },
        { id: "skill-b", selectedByDefault: false },
      ],
      targets: [{ id: "codex", selectedByDefault: true }],
    });
    const state = createDesktopAppState({
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            categoryId: "development",
            categoryTitle: "Development",
            previewPhase: { kind: "idle" },
            skills: [],
            targets: [],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, { previewLoader });

    await viewModel.previewImportGroupIfNeeded("starter");
    await viewModel.previewImportGroupIfNeeded("starter");

    expect(previewLoader).toHaveBeenCalledTimes(1);
    expect(state.importState.recommendedGroups[0]).toEqual(
      expect.objectContaining({
        previewPhase: { kind: "ready" },
        skills: [
          { id: "skill-a", selectedByDefault: true },
          { id: "skill-b", selectedByDefault: false },
        ],
        targets: [{ id: "codex", selectedByDefault: true }],
      }),
    );
  });

  it("marks imports as installed and keeps the user on import page when launched there", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "starter" });
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "importPage" },
      },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, { importer });

    await viewModel.importGroup("starter");

    expect(importer).toHaveBeenCalledWith("starter", {
      selectedSkillIds: ["skill-a"],
      enabledTargets: [],
    });
    expect(state.importState.recommendedGroups[0].isInstalledLocally).toBe(true);
    expect(state.view.currentRoute).toEqual({ kind: "importPage" });
    expect(state.view.toastMessage).toBe("Imported source.");
  });

  it("marks imported search results as installed and routes to detail outside import page", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "starter" });
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "home" },
      },
      importState: {
        importSubmittedQuery: "starter",
        searchGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, { importer });

    await viewModel.importGroup("starter");

    expect(state.importState.searchGroups[0].isInstalledLocally).toBe(true);
    expect(state.view.currentRoute).toEqual({ kind: "detail", sourceId: "starter" });
    expect(state.view.selectedSourceId).toBe("starter");
    expect(state.view.toastMessage).toBe("Imported source.");
  });

  it("shows a toast instead of importing when the group already exists locally", async () => {
    const importer = vi.fn();
    const state = createDesktopAppState({
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            isInstalledLocally: true,
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, { importer });

    await viewModel.importGroup("starter");

    expect(importer).not.toHaveBeenCalled();
    expect(state.view.toastMessage).toBe("This group is already available locally.");
  });

  it("keeps state unchanged and records an import failure toast", async () => {
    const importer = vi.fn().mockRejectedValue(new Error("provider_request_failed"));
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "home" },
      },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, { importer });

    await viewModel.importGroup("starter");

    expect(state.importState.recommendedGroups[0].isInstalledLocally).toBeUndefined();
    expect(state.view.currentRoute).toEqual({ kind: "home" });
    expect(state.view.toastMessage).toBe("Import failed: provider_request_failed");
  });

  it("localizes generated import errors for zh-Hans", async () => {
    const searchViewModel = new ImportViewModel(
      createDesktopAppState({
        settings: { desktopLanguageRawValue: "zh-Hans" },
      }),
      {
        searchLoader: async () => {
          throw "boom";
        },
      },
    );

    await searchViewModel.submitSearch("starter");

    expect(searchViewModel.searchPhase).toEqual({
      kind: "failed",
      message: "导入搜索失败。",
    });

    const previewState = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "idle" },
            skills: [],
            targets: [],
          },
        ],
      },
    });
    const previewViewModel = new ImportViewModel(previewState, {
      previewLoader: async () => {
        throw "boom";
      },
    });

    await previewViewModel.previewImportGroupIfNeeded("starter");

    expect(previewState.importState.recommendedGroups[0].previewPhase).toEqual({
      kind: "failed",
      message: "导入预览失败。",
    });

    const installedState = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            isInstalledLocally: true,
            previewPhase: { kind: "ready" },
            skills: [],
            targets: [],
          },
        ],
      },
    });
    const installedViewModel = new ImportViewModel(installedState);

    await installedViewModel.importGroup("starter");

    expect(installedState.view.toastMessage).toBe("这个组已存在于本地。");

    const successState = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      view: { currentRoute: { kind: "importPage" } },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [],
            targets: [],
          },
        ],
      },
    });
    const successViewModel = new ImportViewModel(successState);

    await successViewModel.importGroup("starter");

    expect(successState.view.toastMessage).toBe("已导入来源。");

    const failedImportState = createDesktopAppState({
      settings: { desktopLanguageRawValue: "zh-Hans" },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [],
            targets: [],
          },
        ],
      },
    });
    const failedImportViewModel = new ImportViewModel(failedImportState, {
      importer: async () => {
        throw "boom";
      },
    });

    await failedImportViewModel.importGroup("starter");

    expect(failedImportState.view.toastMessage).toBe("导入失败：boom");
  });
});

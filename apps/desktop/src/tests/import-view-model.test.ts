import { describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { ImportViewModel } from "../view-models/import-view-model";

describe("import view model", () => {
  it("recreates import screen drafts from shared desktop state after container recreation", () => {
    const state = createDesktopAppState({
      importState: {
        draftsByItemId: {
          starter: {
            selectedSkillIds: [],
            enabledTargetIds: ["cursor"],
          },
        },
      },
    });

    const firstViewModel = new ImportViewModel(state);
    const secondViewModel = new ImportViewModel(state);

    expect(firstViewModel.draftsByItemId.starter).toEqual({
      selectedSkillIds: [],
      enabledTargetIds: ["cursor"],
    });
    expect(secondViewModel.draftsByItemId.starter).toEqual({
      selectedSkillIds: [],
      enabledTargetIds: ["cursor"],
    });
  });

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

  it("mutates import drafts with the same selection rules as the mac container", () => {
    const state = createDesktopAppState({
      importState: {
        searchGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [
              { id: "skill-a", selectedByDefault: true },
              { id: "skill-b", selectedByDefault: true },
            ],
            targets: [
              { id: "codex", selectedByDefault: false },
              { id: "cursor", selectedByDefault: false },
            ],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state);

    expect(viewModel.draftForGroup("starter")).toEqual({
      selectedSkillIds: ["skill-a", "skill-b"],
      enabledTargetIds: [],
    });

    viewModel.setSkillEnabled("starter", "skill-a", false);
    viewModel.setTargetEnabled("starter", "cursor", true);

    expect(state.importState.draftsByItemId.starter).toEqual({
      selectedSkillIds: ["skill-b"],
      enabledTargetIds: ["cursor"],
    });

    viewModel.toggleAllSkills("starter");
    viewModel.toggleAllTargets("starter");

    expect(state.importState.draftsByItemId.starter).toEqual({
      selectedSkillIds: ["skill-a", "skill-b"],
      enabledTargetIds: ["codex", "cursor"],
    });
  });

  it("falls back to visible detected workspace targets when previews do not provide targets", () => {
    const state = createDesktopAppState({
      settings: {
        agentDisplayPreferences: [
          { targetId: "cursor", isVisible: true, sortOrder: 0 },
          { targetId: "codex", isVisible: true, sortOrder: 1 },
          { targetId: "claude-code", isVisible: false, sortOrder: 2 },
        ],
      },
      workspace: {
        inventorySummaries: [
          {
            sourceId: "installed",
            title: "Installed",
            locator: "local/installed",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 2,
            targets: [
              { id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true },
              { id: "claude-code", label: "Claude Code", shortLabel: "CC", isEnabled: true },
            ],
          },
        ],
      },
      importState: {
        searchGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state);

    expect(viewModel.targetsForGroup("starter").map((target) => target.id)).toEqual(["codex"]);

    viewModel.toggleAllTargets("starter");

    expect(state.importState.draftsByItemId.starter).toEqual({
      selectedSkillIds: ["skill-a"],
      enabledTargetIds: ["codex"],
    });
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

  it("loads recommendations without triggering search on page entry", async () => {
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

  it("loads bundled recommendations by default and marks installed local sources", async () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["anthropics-skills"],
        inventorySummaries: [
          {
            sourceId: "anthropics-skills",
            title: "Anthropic Skills",
            locator: "anthropics/skills",
            repoUrl: "https://github.com/anthropics/skills",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 1,
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state);

    await viewModel.loadImportPageIfNeeded();

    const firstSection = viewModel.content.kind === "recommended" ? viewModel.content.sections[0] : undefined;
    expect(firstSection?.title).toBe("General");
    expect(firstSection?.groups[0]).toEqual(
      expect.objectContaining({
        id: "anthropics-skills",
        title: "Skills",
        locator: "anthropics/skills",
        isInstalledLocally: true,
        recommendationDescription: expect.stringContaining("Anthropic"),
      }),
    );
  });

  it("preserves hydrated recommendation content when the import page loads again", async () => {
    const recommendationsLoader = vi.fn().mockReturnValue([
      {
        id: "starter",
        title: "Starter",
        locator: "obra/starter",
        categoryId: "development",
        categoryTitle: "Development",
      },
    ]);
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "stale query",
        importSearchPhase: { kind: "failed", message: "boom" },
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            categoryId: "development",
            categoryTitle: "Development",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, {
      recommendationsLoader,
    });

    await viewModel.loadImportPageIfNeeded();

    expect(recommendationsLoader).not.toHaveBeenCalled();
    expect(viewModel.importSubmittedQuery).toBe("");
    expect(viewModel.searchPhase).toEqual({ kind: "failed", message: "boom" });
    expect(state.importState.recommendedGroups[0]).toEqual(
      expect.objectContaining({
        previewPhase: { kind: "ready" },
        skills: [{ id: "skill-a", selectedByDefault: true }],
        targets: [{ id: "codex", selectedByDefault: true }],
      }),
    );
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

  it("imports from recommendations and from search results with the same route and toast behavior as macOS", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "starter" });

    const recommendationState = createDesktopAppState({
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
    const recommendationViewModel = new ImportViewModel(recommendationState, { importer });

    await recommendationViewModel.importGroup("starter");

    expect(importer).toHaveBeenCalledWith("starter", {
      selectedSkillIds: ["skill-a"],
      enabledTargets: [],
    });
    expect(recommendationState.importState.recommendedGroups[0].isInstalledLocally).toBe(true);
    expect(recommendationState.view.currentRoute).toEqual({ kind: "importPage" });
    expect(recommendationState.view.toastMessage).toBe("Imported source.");

    const searchState = createDesktopAppState({
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
    const searchViewModel = new ImportViewModel(searchState, { importer });

    await searchViewModel.importGroup("starter");

    expect(searchState.importState.searchGroups[0].isInstalledLocally).toBe(true);
    expect(searchState.view.currentRoute).toEqual({ kind: "detail", sourceId: "starter" });
    expect(searchState.view.selectedSourceId).toBe("starter");
    expect(searchState.view.toastMessage).toBe("Imported source.");
  });

  it("prefers persisted draft selections over preview defaults during import", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "starter" });
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "importPage" },
      },
      importState: {
        draftsByItemId: {
          starter: {
            selectedSkillIds: ["skill-b"],
            enabledTargetIds: ["cursor"],
          },
        },
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [
              { id: "skill-a", selectedByDefault: true },
              { id: "skill-b", selectedByDefault: false },
            ],
            targets: [
              { id: "codex", selectedByDefault: true },
              { id: "cursor", selectedByDefault: false },
            ],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, { importer });

    await viewModel.importGroup("starter");

    expect(importer).toHaveBeenCalledWith("starter", {
      selectedSkillIds: ["skill-b"],
      enabledTargets: ["cursor"],
    });
  });

  it("keeps installed state synchronized across recommendation and search copies after import", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "starter" });
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "importPage" },
      },
      importState: {
        importSubmittedQuery: "starter",
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

    expect(state.importState.recommendedGroups[0].isInstalledLocally).toBe(true);
    expect(state.importState.searchGroups[0].isInstalledLocally).toBe(true);
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

  it("opens repository URLs through the injected desktop opener", async () => {
    const openExternalUrl = vi.fn().mockResolvedValue(undefined);
    const viewModel = new ImportViewModel(createDesktopAppState(), { openExternalUrl });

    await viewModel.openRepositoryUrl("  https://github.com/openai/import-group  ");
    await viewModel.openRepositoryUrl("  ");

    expect(openExternalUrl.mock.calls).toEqual([["https://github.com/openai/import-group"]]);
  });
});

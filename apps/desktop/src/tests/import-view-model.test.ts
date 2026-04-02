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
          recommendationDescription: undefined,
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
});

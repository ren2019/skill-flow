import { describe, expect, it } from "vitest";
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
});

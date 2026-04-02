import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { desktopRoute } from "../navigation/desktop-route";
import { HomeViewModel } from "../view-models/home-view-model";

describe("home view model", () => {
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
});

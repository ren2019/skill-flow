import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { desktopRoute } from "../navigation/desktop-route";
import { DetailViewModel } from "../view-models/detail-view-model";

describe("detail view model", () => {
  it("reads and updates the selected source through shared state", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });

    const viewModel = new DetailViewModel(state);

    expect(viewModel.sourceId).toBe("alpha");
    expect(viewModel.currentRoute).toEqual(desktopRoute.detail("alpha"));

    viewModel.showSource("beta");

    expect(state.view.currentRoute).toEqual(desktopRoute.detail("beta"));
    expect(state.view.selectedSourceId).toBe("beta");
    expect(viewModel.sourceId).toBe("beta");
  });

  it("ignores blank detail source ids", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });

    const viewModel = new DetailViewModel(state);

    viewModel.showSource("   ");

    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(state.view.selectedSourceId).toBe("alpha");
  });
});

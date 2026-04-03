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
});

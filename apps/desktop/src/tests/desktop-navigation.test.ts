import { describe, expect, it } from "vitest";
import { DesktopNavigator } from "../navigation/desktop-navigator";
import { desktopRoute } from "../navigation/desktop-route";
import { createDesktopAppState } from "../store/desktop-app-state";

describe("desktop navigation", () => {
  it("starts on the home route with idle bootstrap state", () => {
    const state = createDesktopAppState();
    const navigator = new DesktopNavigator(state);

    expect(navigator.currentRoute).toEqual(desktopRoute.home());
    expect(state.view.currentRoute).toEqual(desktopRoute.home());
    expect(state.asyncResources.homeBootstrapPhase).toEqual({ kind: "idle" });
  });

  it("writes detail navigation into the shared app state", () => {
    const state = createDesktopAppState();
    const navigator = new DesktopNavigator(state);

    navigator.showDetail("alpha");

    expect(state.view.selectedSourceId).toBe("alpha");
    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(navigator.currentRoute).toEqual(desktopRoute.detail("alpha"));
  });

  it("writes remaining routes into the shared app state", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("seed"),
      },
    });
    const navigator = new DesktopNavigator(state);

    navigator.showHome();
    expect(state.view.currentRoute).toEqual(desktopRoute.home());
    expect(navigator.currentRoute).toEqual(desktopRoute.home());

    navigator.showImportPage();
    expect(state.view.currentRoute).toEqual(desktopRoute.importPage());
    expect(navigator.currentRoute).toEqual(desktopRoute.importPage());

    navigator.showSettings();
    expect(state.view.currentRoute).toEqual(desktopRoute.settings());
    expect(navigator.currentRoute).toEqual(desktopRoute.settings());
  });
});

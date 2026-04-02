import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { SettingsViewModel } from "../view-models/settings-view-model";

describe("settings view model", () => {
  it("writes settings through the shared state", () => {
    const state = createDesktopAppState();
    const viewModel = new SettingsViewModel(state);

    expect(viewModel.autoLaunch).toBe(false);

    viewModel.autoLaunch = true;

    expect(state.settings.autoLaunch).toBe(true);
    expect(viewModel.autoLaunch).toBe(true);
  });
});

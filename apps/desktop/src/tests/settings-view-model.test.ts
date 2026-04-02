import { describe, expect, it, vi } from "vitest";
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

  it("falls back to the latest releases page when no release has been fetched", () => {
    const opener = vi.fn();
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      releasePageOpener: opener,
    });

    viewModel.openReleasePage();

    expect(opener).toHaveBeenCalledWith(
      "https://github.com/VintLin/skill-flow/releases/latest",
    );
  });
});

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

  it("marks updates as available when the fetched version is newer", async () => {
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      updateChecker: {
        fetchLatestRelease: vi.fn().mockResolvedValue({
          version: "1.3.1",
          releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
        }),
      },
      currentVersionProvider: () => "1.1.0",
    });

    await viewModel.checkForUpdates();

    expect(viewModel.updateStatus).toBe("updateAvailable");
    expect(viewModel.latestVersion).toBe("1.3.1");
    expect(viewModel.releaseUrl).toBe(
      "https://github.com/VintLin/skill-flow/releases/tag/v1.3.1",
    );
  });

  it("performs background update checking only once per view model instance", async () => {
    const fetchLatestRelease = vi.fn().mockResolvedValue({
      version: "1.1.0",
      releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.1.0",
    });
    const viewModel = new SettingsViewModel(createDesktopAppState(), {
      updateChecker: { fetchLatestRelease },
      currentVersionProvider: () => "1.1.0",
    });

    await viewModel.checkForUpdatesIfNeeded();
    await viewModel.checkForUpdatesIfNeeded();

    expect(fetchLatestRelease).toHaveBeenCalledTimes(1);
    expect(viewModel.updateStatus).toBe("upToDate");
  });
});

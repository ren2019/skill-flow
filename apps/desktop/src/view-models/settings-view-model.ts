import type { DesktopAppState } from "../store/desktop-app-state";
import type { AgentDisplayPreference } from "../store/settings-state";
import { DesktopUpdateChecker } from "../runtime/update-checker";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "upToDate"
  | "updateAvailable"
  | "failed";

type UpdateStateSeed = {
  status: UpdateStatus;
  latestVersion?: string;
  releaseUrl?: string;
};

type SettingsViewModelOptions = {
  updateChecker?: Pick<DesktopUpdateChecker, "fetchLatestRelease">;
  currentVersionProvider?: () => string;
  releasePageOpener?: (url: string) => void;
  onChange?: () => void;
};

export class SettingsViewModel {
  static readonly latestReleasesUrl = "https://github.com/VintLin/skill-flow/releases/latest";

  private readonly updateChecker: Pick<DesktopUpdateChecker, "fetchLatestRelease">;
  private readonly currentVersionProvider: () => string;
  private readonly releasePageOpener: (url: string) => void;
  private readonly onChange: () => void;
  private hasPerformedBackgroundUpdateCheck = false;
  private currentUpdateStatus: UpdateStatus = "idle";
  private currentLatestVersion: string | undefined;
  private latestReleaseUrl: string | undefined;

  constructor(
    private readonly state: DesktopAppState,
    options: SettingsViewModelOptions = {},
  ) {
    this.updateChecker = options.updateChecker ?? new DesktopUpdateChecker();
    this.currentVersionProvider = options.currentVersionProvider ?? (() => "dev");
    this.releasePageOpener = options.releasePageOpener ?? (() => undefined);
    this.onChange = options.onChange ?? (() => undefined);
  }

  get autoLaunch(): boolean {
    return this.state.settings.autoLaunch;
  }

  set autoLaunch(value: boolean) {
    this.state.settings.autoLaunch = value;
  }

  get logLevel(): string {
    return this.state.settings.logLevel;
  }

  set logLevel(value: string) {
    this.state.settings.logLevel = value;
  }

  get agentDisplayPreferences(): AgentDisplayPreference[] {
    return this.state.settings.agentDisplayPreferences;
  }

  get currentVersion(): string {
    return this.currentVersionProvider();
  }

  get updateStatus(): UpdateStatus {
    return this.currentUpdateStatus;
  }

  get latestVersion(): string | undefined {
    return this.currentLatestVersion;
  }

  get releaseUrl(): string | undefined {
    return this.latestReleaseUrl;
  }

  async checkForUpdates(): Promise<void> {
    this.currentUpdateStatus = "checking";
    this.onChange();

    try {
      const release = await this.updateChecker.fetchLatestRelease();
      this.currentLatestVersion = release.version;
      this.latestReleaseUrl = release.releaseUrl;
      this.currentUpdateStatus =
        compareVersions(release.version, this.currentVersion) > 0
          ? "updateAvailable"
          : "upToDate";
    } catch {
      this.currentLatestVersion = undefined;
      this.latestReleaseUrl = undefined;
      this.currentUpdateStatus = "failed";
    }
    this.onChange();
  }

  async checkForUpdatesIfNeeded(): Promise<void> {
    if (this.hasPerformedBackgroundUpdateCheck) {
      return;
    }
    this.hasPerformedBackgroundUpdateCheck = true;
    await this.checkForUpdates();
  }

  hydrateUpdateState(seed: UpdateStateSeed): void {
    this.currentUpdateStatus = seed.status;
    this.currentLatestVersion = seed.latestVersion;
    this.latestReleaseUrl = seed.releaseUrl;
    this.onChange();
  }

  openReleasePage(): void {
    this.releasePageOpener(this.latestReleaseUrl ?? SettingsViewModel.latestReleasesUrl);
  }
}

function compareVersions(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

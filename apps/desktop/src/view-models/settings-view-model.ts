import type { DesktopAppState } from "../store/desktop-app-state";
import type { AgentDisplayPreference } from "../store/settings-state";
import { DesktopUpdateChecker } from "../runtime/update-checker";

type SettingsViewModelOptions = {
  updateChecker?: Pick<DesktopUpdateChecker, "fetchLatestRelease">;
  currentVersionProvider?: () => string;
  releasePageOpener?: (url: string) => void;
};

export class SettingsViewModel {
  static readonly latestReleasesUrl = "https://github.com/VintLin/skill-flow/releases/latest";

  private readonly updateChecker: Pick<DesktopUpdateChecker, "fetchLatestRelease">;
  private readonly currentVersionProvider: () => string;
  private readonly releasePageOpener: (url: string) => void;
  private latestReleaseUrl: string | undefined;

  constructor(
    private readonly state: DesktopAppState,
    options: SettingsViewModelOptions = {},
  ) {
    this.updateChecker = options.updateChecker ?? new DesktopUpdateChecker();
    this.currentVersionProvider = options.currentVersionProvider ?? (() => "dev");
    this.releasePageOpener = options.releasePageOpener ?? (() => undefined);
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

  async checkForUpdates(): Promise<void> {
    const release = await this.updateChecker.fetchLatestRelease();
    this.latestReleaseUrl = release.releaseUrl;
  }

  openReleasePage(): void {
    this.releasePageOpener(this.latestReleaseUrl ?? SettingsViewModel.latestReleasesUrl);
  }
}

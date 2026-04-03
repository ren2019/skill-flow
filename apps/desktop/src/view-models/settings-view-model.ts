import type { DesktopAppState } from "../store/desktop-app-state";
import { createSettingsState } from "../store/settings-state";
import type { AgentDisplayPreference } from "../store/settings-state";
import { DesktopUpdateChecker } from "../runtime/update-checker";
import { DesktopSettingsStore, normalizeAgentDisplayPreferences } from "../runtime/settings-store";

type DesktopMaintenance = {
  clearMetadataCache(): Promise<void> | void;
};

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
  store?: Pick<DesktopSettingsStore, "load" | "save">;
  updateChecker?: Pick<DesktopUpdateChecker, "fetchLatestRelease">;
  currentVersionProvider?: () => string;
  releasePageOpener?: (url: string) => void;
  maintenance?: DesktopMaintenance;
  onChange?: () => void;
};

export class SettingsViewModel {
  static readonly latestReleasesUrl = "https://github.com/VintLin/skill-flow/releases/latest";

  private readonly updateChecker: Pick<DesktopUpdateChecker, "fetchLatestRelease">;
  private readonly currentVersionProvider: () => string;
  private readonly releasePageOpener: (url: string) => void;
  private readonly maintenance: DesktopMaintenance;
  private readonly store: Pick<DesktopSettingsStore, "load" | "save"> | undefined;
  private readonly onChange: () => void;
  private hasPerformedBackgroundUpdateCheck = false;
  private currentUpdateStatus: UpdateStatus = "idle";
  private currentLatestVersion: string | undefined;
  private latestReleaseUrl: string | undefined;

  constructor(
    private readonly state: DesktopAppState,
    options: SettingsViewModelOptions = {},
  ) {
    this.store = options.store;
    this.updateChecker = options.updateChecker ?? new DesktopUpdateChecker();
    this.currentVersionProvider = options.currentVersionProvider ?? (() => "dev");
    this.releasePageOpener = options.releasePageOpener ?? (() => undefined);
    this.maintenance = options.maintenance ?? { clearMetadataCache: () => undefined };
    this.onChange = options.onChange ?? (() => undefined);
    if (this.store) {
      const loadedSettings = this.store.load();
      this.state.settings = createSettingsState({
        ...loadedSettings,
        agentDisplayPreferences: normalizeAgentDisplayPreferences(
          loadedSettings.agentDisplayPreferences,
        ),
      });
    }
  }

  get autoLaunch(): boolean {
    return this.state.settings.autoLaunch;
  }

  set autoLaunch(value: boolean) {
    this.state.settings.autoLaunch = value;
    this.persistSettings();
  }

  get logLevel(): string {
    return this.state.settings.logLevel;
  }

  set logLevel(value: string) {
    this.state.settings.logLevel = value;
    this.persistSettings();
  }

  get agentDisplayPreferences(): AgentDisplayPreference[] {
    return this.state.settings.agentDisplayPreferences;
  }

  get themeMode(): string {
    return this.state.settings.themeModeRawValue;
  }

  set themeMode(value: string) {
    this.state.settings.themeModeRawValue = value;
    this.persistSettings();
  }

  get themeAccent(): string {
    return this.state.settings.themeAccentRawValue;
  }

  set themeAccent(value: string) {
    this.state.settings.themeAccentRawValue = value;
    this.persistSettings();
  }

  get externalHelperOverride(): boolean {
    return this.state.settings.experimentalExternalHelper;
  }

  set externalHelperOverride(value: boolean) {
    this.state.settings.experimentalExternalHelper = value;
    this.persistSettings();
  }

  get desktopLanguage(): string {
    return this.state.settings.desktopLanguageRawValue;
  }

  set desktopLanguage(value: string) {
    this.state.settings.desktopLanguageRawValue = value;
    this.persistSettings();
  }

  get homeCardDensity(): string {
    return this.state.settings.homeCardDensityRawValue;
  }

  set homeCardDensity(value: string) {
    this.state.settings.homeCardDensityRawValue = value;
    this.persistSettings();
  }

  get menuCardDensity(): string {
    return this.state.settings.menuCardDensityRawValue;
  }

  set menuCardDensity(value: string) {
    this.state.settings.menuCardDensityRawValue = value;
    this.persistSettings();
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

  async clearMetadataCache(): Promise<void> {
    await this.maintenance.clearMetadataCache();
    this.onChange();
  }

  resetConfiguration(): void {
    Object.assign(this.state.settings, createSettingsState());
    this.persistSettings();
  }

  setAgentVisibility(targetId: string, isVisible: boolean): void {
    const nextPreferences = normalizeAgentDisplayPreferences(this.state.settings.agentDisplayPreferences);
    const targetPreference = nextPreferences.find((preference) => preference.targetId === targetId);
    if (!targetPreference) {
      return;
    }

    targetPreference.isVisible = isVisible;
    this.state.settings.agentDisplayPreferences = nextPreferences;
    this.persistSettings();
  }

  resetAgentDisplayPreferences(): void {
    this.state.settings.agentDisplayPreferences = [];
    this.persistSettings();
  }

  private persistSettings(): void {
    this.store?.save(this.state.settings);
    this.onChange();
  }
}

function compareVersions(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

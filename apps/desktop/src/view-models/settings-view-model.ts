import type { DesktopAppState } from "../store/desktop-app-state";
import { desktopRoute } from "../navigation/desktop-route";
import { createSettingsState } from "../store/settings-state";
import type { AgentDisplayPreference, CustomAgentDefinition } from "../store/settings-state";
import { DesktopUpdateChecker } from "../runtime/update-checker";
import {
  DesktopSettingsStore,
  detectedAgentRows,
  normalizeAgentDisplayPreferences,
  type AgentDisplayRow,
} from "../runtime/settings-store";
import type { DesktopAccentColor, DesktopThemeMode } from "../theme/app-theme";

type DesktopMaintenance = {
  clearMetadataCache(): Promise<void> | void;
};

export type UpdateStatus =
  | "idle"
  | "checking"
  | "upToDate"
  | "updateAvailable"
  | "runningNewerBuild"
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

export type CustomAgentDraft = {
  name: string;
  globalPath: string;
  projectPathTemplate: string;
  strategy: string;
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
          loadedSettings.customAgents,
        ),
        customAgents: loadedSettings.customAgents,
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

  get customAgents(): CustomAgentDefinition[] {
    return this.state.settings.customAgents
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }

  get themeMode(): DesktopThemeMode {
    return this.state.settings.themeModeRawValue as DesktopThemeMode;
  }

  set themeMode(value: string) {
    this.state.settings.themeModeRawValue = value;
    this.persistSettings();
  }

  get themeAccent(): DesktopAccentColor {
    return this.state.settings.themeAccentRawValue as DesktopAccentColor;
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

  showHome(): void {
    this.state.view.currentRoute = desktopRoute.home();
    this.onChange();
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
      if (compareVersions(release.version, this.currentVersion) > 0) {
        this.currentUpdateStatus = "updateAvailable";
      } else if (compareVersions(this.currentVersion, release.version) > 0) {
        this.currentUpdateStatus = "runningNewerBuild";
      } else {
        this.currentUpdateStatus = "upToDate";
      }
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
    const nextPreferences = normalizeAgentDisplayPreferences(
      this.state.settings.agentDisplayPreferences,
      this.state.settings.customAgents,
    );
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

  allAgentRows(): AgentDisplayRow[] {
    return detectedAgentRows(
      this.state.settings.agentDisplayPreferences,
      this.state.settings.customAgents,
    );
  }

  detectedAgentRows(detectedTargetIds: string[]): AgentDisplayRow[] {
    return detectedAgentRows(
      this.state.settings.agentDisplayPreferences,
      this.state.settings.customAgents,
      detectedTargetIds,
    );
  }

  moveAgents(fromIndex: number, toIndex: number, detectedTargetIds: string[]): void {
    const detectedSet = new Set(detectedTargetIds);
    const customTargetIds = new Set(this.state.settings.customAgents.map((agent) => agent.id));
    const preferences = normalizeAgentDisplayPreferences(
      this.state.settings.agentDisplayPreferences,
      this.state.settings.customAgents,
    );
    const detectedPreferences = preferences.filter((preference) =>
      detectedSet.has(preference.targetId) || customTargetIds.has(preference.targetId),
    );
    if (
      fromIndex < 0 ||
      fromIndex >= detectedPreferences.length ||
      toIndex < 0 ||
      toIndex > detectedPreferences.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const reordered = detectedPreferences.slice();
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) {
      return;
    }
    reordered.splice(toIndex, 0, moved);

    const reorderedIterator = reordered[Symbol.iterator]();
    const nextPreferences = preferences.map((preference) => {
      if (!detectedSet.has(preference.targetId) && !customTargetIds.has(preference.targetId)) {
        return preference;
      }
      const nextPreference = reorderedIterator.next().value as AgentDisplayPreference | undefined;
      return nextPreference
        ? {
          ...nextPreference,
          sortOrder: preference.sortOrder,
        }
        : preference;
    });

    this.state.settings.agentDisplayPreferences = normalizeAgentDisplayPreferences(
      nextPreferences,
      this.state.settings.customAgents,
    );
    this.persistSettings();
  }

  customAgentDraft(editingId?: string): CustomAgentDraft {
    const existing = editingId
      ? this.state.settings.customAgents.find((agent) => agent.id === editingId)
      : undefined;
    return {
      name: existing?.name ?? "",
      globalPath: existing?.globalPath ?? "",
      projectPathTemplate: existing?.projectPathTemplate ?? "",
      strategy: existing?.strategy ?? "symlink",
    };
  }

  upsertCustomAgent(draft: CustomAgentDraft, editingId?: string): Record<string, string> {
    const errors = this.validateCustomAgent(draft, editingId);
    if (Object.keys(errors).length > 0) {
      return errors;
    }

    const now = new Date().toISOString();
    const name = draft.name.trim();
    const globalPath = draft.globalPath.trim();
    const projectPathTemplate = normalizeProjectPath(draft.projectPathTemplate) ?? draft.projectPathTemplate.trim();
    const resolvedId = editingId ?? this.makeCustomAgentId(name);
    const existingIndex = this.state.settings.customAgents.findIndex((agent) => agent.id === editingId);
    const nextAgent: CustomAgentDefinition = {
      id: resolvedId,
      name,
      globalPath,
      projectPathTemplate,
      strategy: draft.strategy,
      createdAt: existingIndex >= 0 ? this.state.settings.customAgents[existingIndex]?.createdAt ?? now : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      this.state.settings.customAgents = this.state.settings.customAgents.map((agent, index) =>
        index === existingIndex ? nextAgent : agent,
      );
    } else {
      this.state.settings.customAgents = [...this.state.settings.customAgents, nextAgent];
    }

    const preferences = normalizeAgentDisplayPreferences(
      this.state.settings.agentDisplayPreferences,
      this.state.settings.customAgents,
    );
    if (!preferences.some((preference) => preference.targetId === resolvedId)) {
      preferences.push({ targetId: resolvedId, isVisible: true, sortOrder: preferences.length });
    }
    this.state.settings.agentDisplayPreferences = normalizeAgentDisplayPreferences(
      preferences,
      this.state.settings.customAgents,
    );
    this.persistSettings();
    return {};
  }

  deleteCustomAgent(id: string): void {
    this.state.settings.customAgents = this.state.settings.customAgents.filter((agent) => agent.id !== id);
    this.state.settings.agentDisplayPreferences = normalizeAgentDisplayPreferences(
      this.state.settings.agentDisplayPreferences.filter((preference) => preference.targetId !== id),
      this.state.settings.customAgents,
    );
    this.persistSettings();
  }

  private persistSettings(): void {
    this.store?.save(this.state.settings);
    this.onChange();
  }

  private validateCustomAgent(draft: CustomAgentDraft, editingId?: string): Record<string, string> {
    const errors: Record<string, string> = {};
    const name = draft.name.trim();
    const globalPath = draft.globalPath.trim();

    if (!name) {
      errors.name = "Name is required.";
    }
    if (!globalPath) {
      errors.globalPath = "Global path is required.";
    } else if (!isAbsolutePath(globalPath)) {
      errors.globalPath = "Global path must be absolute.";
    }
    if (normalizeProjectPath(draft.projectPathTemplate) === undefined) {
      errors.projectPathTemplate = "Project path must be relative.";
    }
    if (this.state.settings.customAgents.some((agent) =>
      agent.id !== editingId && agent.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0
    )) {
      errors.name = "Name is already in use.";
    }

    return errors;
  }

  private makeCustomAgentId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "custom-agent";
    const usedIds = new Set([
      ...this.state.settings.customAgents.map((agent) => agent.id),
      ...normalizeAgentDisplayPreferences([], []).map((preference) => preference.targetId),
    ]);
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

function compareVersions(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

function normalizeProjectPath(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isAbsolutePath(trimmed)) {
    return undefined;
  }
  const normalized = trimmed.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    return undefined;
  }
  return normalized;
}

function isAbsolutePath(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

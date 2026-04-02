export type DesktopCardDensity = "comfortable" | "compact";

export type ProjectScopeSelection =
  | { kind: "global" }
  | { kind: "project"; projectId: string };

export type RecentProjectScopeItem = {
  projectId: string;
  title: string;
  lastActivityAt: string;
  projectPath?: string;
  tools: string[];
};

export type AgentDisplayPreference = {
  targetId: string;
  isVisible: boolean;
  sortOrder: number;
};

export type SettingsState = {
  autoLaunch: boolean;
  logLevel: string;
  experimentalExternalHelper: boolean;
  desktopLanguageRawValue: string;
  themeModeRawValue: string;
  themeAccentRawValue: string;
  homeCardDensityRawValue: string;
  menuCardDensityRawValue: string;
  selectedProjectScope: ProjectScopeSelection;
  recentProjectScopes: RecentProjectScopeItem[];
  agentDisplayPreferences: AgentDisplayPreference[];
};

export function createSettingsState(seed: Partial<SettingsState> = {}): SettingsState {
  return {
    autoLaunch: seed.autoLaunch ?? false,
    logLevel: seed.logLevel ?? "info",
    experimentalExternalHelper: seed.experimentalExternalHelper ?? false,
    desktopLanguageRawValue: seed.desktopLanguageRawValue ?? "system",
    themeModeRawValue: seed.themeModeRawValue ?? "light",
    themeAccentRawValue: seed.themeAccentRawValue ?? "blue",
    homeCardDensityRawValue: seed.homeCardDensityRawValue ?? "comfortable",
    menuCardDensityRawValue: seed.menuCardDensityRawValue ?? "compact",
    selectedProjectScope: seed.selectedProjectScope ?? { kind: "global" },
    recentProjectScopes: [...(seed.recentProjectScopes ?? [])],
    agentDisplayPreferences: [...(seed.agentDisplayPreferences ?? [])],
  };
}

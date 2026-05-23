import type {
  AgentDisplayPreference,
  CustomAgentDefinition,
  RecentProjectScopeItem,
  SettingsState,
  ProjectScopeSelection,
} from "../store/settings-state";

export type SettingsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function createDesktopSettingsStorage(): SettingsStorage {
  const storage = readBrowserLocalStorage();
  if (storage) {
    return storage;
  }

  const fallbackSettingsValues = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return fallbackSettingsValues.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      fallbackSettingsValues.set(key, value);
    },
  };
}

function readBrowserLocalStorage(): SettingsStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const storage = window.localStorage;
    if (
      typeof storage?.getItem !== "function" ||
      typeof storage.setItem !== "function"
    ) {
      return undefined;
    }

    return {
      getItem(key: string): string | null {
        return storage.getItem(key);
      },
      setItem(key: string, value: string): void {
        storage.setItem(key, value);
      },
    };
  } catch {
    return undefined;
  }
}

export type AgentDisplayRow = {
  targetId: string;
  title: string;
  shortLabel: string;
  mountPath: string;
  projectPath?: string;
  isVisible: boolean;
  isBuiltIn: boolean;
};

export const settingsKeys = {
  autoLaunch: "desktop.autoLaunch",
  logLevel: "desktop.logLevel",
  externalHelper: "desktop.experimentalExternalHelper",
  desktopLanguage: "desktop.language",
  themeMode: "desktop.themeMode",
  themeAccent: "desktop.themeAccent",
  homeCardDensity: "desktop.homeCardDensity",
  menuCardDensity: "desktop.menuCardDensity",
  selectedProjectScope: "desktop.selectedProjectScope",
  recentProjectScopes: "desktop.recentProjectScopes",
  agentDisplayPreferences: "desktop.agentDisplayPreferences",
  customAgents: "desktop.customAgents",
} as const;

const defaultTargetOrder = [
  "claude-code",
  "codex",
  "cursor",
  "github-copilot",
  "gemini-cli",
  "opencode",
  "openclaw",
  "hermes-agent",
  "pi",
  "trae",
  "windsurf",
  "roo-code",
  "cline",
  "amp",
  "kiro",
] as const;

const labelsByTargetId: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  "github-copilot": "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
  opencode: "OpenCode",
  openclaw: "OpenClaw",
  "hermes-agent": "Hermes Agent",
  pi: "Pi",
  trae: "Trae",
  windsurf: "Windsurf",
  "roo-code": "Roo Code",
  cline: "Cline",
  amp: "Amp",
  kiro: "Kiro",
};

const shortLabelsByTargetId: Record<string, string> = {
  "claude-code": "CC",
  codex: "CX",
  cursor: "CU",
  "github-copilot": "GH",
  "gemini-cli": "GM",
  opencode: "OP",
  openclaw: "OC",
  "hermes-agent": "HA",
  pi: "PI",
  trae: "TR",
  windsurf: "WS",
  "roo-code": "RO",
  cline: "CL",
  amp: "AM",
  kiro: "KI",
};

const globalPathSuffixByTargetId: Record<string, string> = {
  "claude-code": ".claude/skills",
  codex: ".codex/skills",
  cursor: ".cursor/skills",
  "github-copilot": ".copilot/skills",
  "gemini-cli": ".gemini/skills",
  opencode: ".config/opencode/skills",
  openclaw: ".openclaw/skills",
  "hermes-agent": ".hermes/skills",
  pi: ".pi/agent/skills",
  trae: ".trae/skills",
  windsurf: ".codeium/windsurf/skills",
  "roo-code": ".roo/skills",
  cline: ".agents/skills",
  amp: ".config/agents/skills",
  kiro: ".kiro/skills",
};

const projectPathByTargetId: Record<string, string> = {
  "claude-code": ".claude/skills",
  codex: ".agents/skills",
  cursor: ".agents/skills",
  "github-copilot": ".agents/skills",
  "gemini-cli": ".agents/skills",
  opencode: ".agents/skills",
  openclaw: "skills",
  "hermes-agent": ".hermes/skills",
  pi: ".pi/skills",
  trae: ".trae/skills",
  windsurf: ".windsurf/skills",
  "roo-code": ".roo/skills",
  cline: ".agents/skills",
  amp: ".agents/skills",
  kiro: ".kiro/skills",
};

export class DesktopSettingsStore {
  constructor(private readonly storage: SettingsStorage) {}

  load(): SettingsState {
    return {
      autoLaunch: this.storage.getItem(settingsKeys.autoLaunch) === "true",
      logLevel: this.storage.getItem(settingsKeys.logLevel) ?? "info",
      experimentalExternalHelper: this.storage.getItem(settingsKeys.externalHelper) === "true",
      desktopLanguageRawValue: this.storage.getItem(settingsKeys.desktopLanguage) ?? "system",
      themeModeRawValue: this.storage.getItem(settingsKeys.themeMode) ?? "light",
      themeAccentRawValue: this.storage.getItem(settingsKeys.themeAccent) ?? "blue",
      homeCardDensityRawValue: this.storage.getItem(settingsKeys.homeCardDensity) ?? "comfortable",
      menuCardDensityRawValue: this.storage.getItem(settingsKeys.menuCardDensity) ?? "compact",
      selectedProjectScope: parseJson<ProjectScopeSelection>(
        this.storage.getItem(settingsKeys.selectedProjectScope),
        { kind: "global" },
      ),
      recentProjectScopes: parseJson<RecentProjectScopeItem[]>(
        this.storage.getItem(settingsKeys.recentProjectScopes),
        [],
      ),
      agentDisplayPreferences: normalizeAgentDisplayPreferences(
        parseJson<AgentDisplayPreference[]>(
          this.storage.getItem(settingsKeys.agentDisplayPreferences),
          [],
        ),
        parseJson<CustomAgentDefinition[]>(
          this.storage.getItem(settingsKeys.customAgents),
          [],
        ),
      ),
      customAgents: parseJson<CustomAgentDefinition[]>(
        this.storage.getItem(settingsKeys.customAgents),
        [],
      ),
    };
  }

  save(state: SettingsState): void {
    this.storage.setItem(settingsKeys.autoLaunch, String(state.autoLaunch));
    this.storage.setItem(settingsKeys.logLevel, state.logLevel);
    this.storage.setItem(settingsKeys.externalHelper, String(state.experimentalExternalHelper));
    this.storage.setItem(settingsKeys.desktopLanguage, state.desktopLanguageRawValue);
    this.storage.setItem(settingsKeys.themeMode, state.themeModeRawValue);
    this.storage.setItem(settingsKeys.themeAccent, state.themeAccentRawValue);
    this.storage.setItem(settingsKeys.homeCardDensity, state.homeCardDensityRawValue);
    this.storage.setItem(settingsKeys.menuCardDensity, state.menuCardDensityRawValue);
    this.storage.setItem(settingsKeys.selectedProjectScope, JSON.stringify(state.selectedProjectScope));
    this.storage.setItem(settingsKeys.recentProjectScopes, JSON.stringify(state.recentProjectScopes));
    this.storage.setItem(
      settingsKeys.agentDisplayPreferences,
      JSON.stringify(normalizeAgentDisplayPreferences(state.agentDisplayPreferences, state.customAgents)),
    );
    this.storage.setItem(settingsKeys.customAgents, JSON.stringify(state.customAgents));
  }
}

export function defaultAgentDisplayPreferences(
  customAgents: CustomAgentDefinition[] = [],
): AgentDisplayPreference[] {
  return orderedTargetIds(customAgents).map((targetId, index) => ({
    targetId,
    isVisible: true,
    sortOrder: index,
  }));
}

export function normalizeAgentDisplayPreferences(
  rawPreferences: AgentDisplayPreference[],
  customAgents: CustomAgentDefinition[] = [],
): AgentDisplayPreference[] {
  const targetOrder = orderedTargetIds(customAgents);
  const knownTargetIds = new Set<string>(targetOrder);
  const validPreferences = rawPreferences.filter((item) => knownTargetIds.has(item.targetId));
  const rawByTargetId = new Map(validPreferences.map((item) => [item.targetId, item]));
  const baseOrder = validPreferences
    .slice()
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return defaultIndex(left.targetId, customAgents) - defaultIndex(right.targetId, customAgents);
    })
    .map((item) => item.targetId);
  const normalizedTargetIds = [
    ...baseOrder,
    ...targetOrder.filter((targetId) => !rawByTargetId.has(targetId)),
  ];

  return normalizedTargetIds.map((targetId, index) => ({
    targetId,
    isVisible: rawByTargetId.get(targetId)?.isVisible ?? true,
    sortOrder: index,
  }));
}

export function agentDisplayLabel(targetId: string): string {
  return labelsByTargetId[targetId] ?? targetId;
}

export function agentDisplayShortLabel(
  targetId: string,
  customAgents: CustomAgentDefinition[] = [],
): string {
  const customAgent = customAgents.find((agent) => agent.id === targetId);
  if (customAgent) {
    return monogram(customAgent.name);
  }
  return shortLabelsByTargetId[targetId] ?? agentDisplayLabel(targetId).slice(0, 2).toUpperCase();
}

export function agentDisplayTitle(
  targetId: string,
  customAgents: CustomAgentDefinition[] = [],
): string {
  return customAgents.find((agent) => agent.id === targetId)?.name ?? agentDisplayLabel(targetId);
}

export function agentMountPath(
  targetId: string,
  customAgents: CustomAgentDefinition[] = [],
): string {
  const customAgent = customAgents.find((agent) => agent.id === targetId);
  if (customAgent) {
    return customAgent.globalPath;
  }
  const suffix = globalPathSuffixByTargetId[targetId];
  if (!suffix) {
    return targetId;
  }

  return joinHomePath(suffix);
}

export function agentProjectPath(
  targetId: string,
  customAgents: CustomAgentDefinition[] = [],
): string | undefined {
  const customAgent = customAgents.find((agent) => agent.id === targetId);
  return customAgent?.projectPathTemplate || projectPathByTargetId[targetId];
}

export function detectedAgentRows(
  preferences: AgentDisplayPreference[],
  customAgents: CustomAgentDefinition[] = [],
  detectedTargetIds?: string[],
): AgentDisplayRow[] {
  const detectedSet = new Set(detectedTargetIds);
  const customTargetIds = new Set(customAgents.map((agent) => agent.id));
  return normalizeAgentDisplayPreferences(preferences, customAgents)
    .filter((preference) => detectedTargetIds === undefined || detectedSet.has(preference.targetId) || customTargetIds.has(preference.targetId))
    .map((preference) => {
      const projectPath = agentProjectPath(preference.targetId, customAgents);
      return {
        targetId: preference.targetId,
        title: agentDisplayTitle(preference.targetId, customAgents),
        shortLabel: agentDisplayShortLabel(preference.targetId, customAgents),
        mountPath: agentMountPath(preference.targetId, customAgents),
        ...(projectPath ? { projectPath } : {}),
        isVisible: preference.isVisible,
        isBuiltIn: isBuiltInTarget(preference.targetId),
      };
    });
}

export function isBuiltInTarget(targetId: string): boolean {
  return defaultTargetOrder.includes(targetId as (typeof defaultTargetOrder)[number]);
}

function orderedTargetIds(customAgents: CustomAgentDefinition[]): string[] {
  return [...defaultTargetOrder, ...customAgents.map((agent) => agent.id)];
}

function defaultIndex(targetId: string, customAgents: CustomAgentDefinition[]): number {
  const targetOrder = orderedTargetIds(customAgents);
  const index = targetOrder.indexOf(
    targetId as (typeof defaultTargetOrder)[number],
  );
  return index === -1 ? targetOrder.length : index;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function joinHomePath(suffix: string): string {
  const home = homeDirectory();
  const trimmedHome = home.replace(/[\\/]+$/, "");
  return `${trimmedHome}/${suffix.replace(/^[\\/]+/, "")}`;
}

function homeDirectory(): string {
  const maybeProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process;
  return maybeProcess?.env?.HOME ?? maybeProcess?.env?.USERPROFILE ?? "~";
}

function monogram(name: string): string {
  const tokens = name
    .split(/[\s_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length >= 2) {
    return tokens.slice(0, 2).map((token) => token[0]).join("").toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

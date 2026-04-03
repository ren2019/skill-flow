import os from "node:os";
import path from "node:path";
import type {
  AgentDisplayPreference,
  RecentProjectScopeItem,
  SettingsState,
  ProjectScopeSelection,
} from "../store/settings-state";

export type SettingsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function createDesktopSettingsStorage(): SettingsStorage {
  if (
    typeof globalThis.localStorage !== "undefined"
    && typeof globalThis.localStorage.getItem === "function"
    && typeof globalThis.localStorage.setItem === "function"
  ) {
    return {
      getItem(key: string): string | null {
        return globalThis.localStorage.getItem(key);
      },
      setItem(key: string, value: string): void {
        globalThis.localStorage.setItem(key, value);
      },
    };
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

export type AgentDisplayRow = {
  targetId: string;
  title: string;
  shortLabel: string;
  mountPath: string;
  isVisible: boolean;
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
} as const;

const defaultTargetOrder = [
  "claude-code",
  "codex",
  "cursor",
  "github-copilot",
  "gemini-cli",
  "opencode",
  "openclaw",
  "pi",
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
  pi: "Pi",
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
  pi: "PI",
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
  pi: ".pi/agent/skills",
  windsurf: ".codeium/windsurf/skills",
  "roo-code": ".roo/skills",
  cline: ".agents/skills",
  amp: ".config/agents/skills",
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
      JSON.stringify(normalizeAgentDisplayPreferences(state.agentDisplayPreferences)),
    );
  }
}

export function defaultAgentDisplayPreferences(): AgentDisplayPreference[] {
  return defaultTargetOrder.map((targetId, index) => ({
    targetId,
    isVisible: true,
    sortOrder: index,
  }));
}

export function normalizeAgentDisplayPreferences(
  rawPreferences: AgentDisplayPreference[],
): AgentDisplayPreference[] {
  const knownTargetIds = new Set<string>(defaultTargetOrder);
  const validPreferences = rawPreferences.filter((item) => knownTargetIds.has(item.targetId));
  const rawByTargetId = new Map(validPreferences.map((item) => [item.targetId, item]));
  const baseOrder = validPreferences
    .slice()
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return defaultIndex(left.targetId) - defaultIndex(right.targetId);
    })
    .map((item) => item.targetId);
  const orderedTargetIds = [
    ...baseOrder,
    ...defaultTargetOrder.filter((targetId) => !rawByTargetId.has(targetId)),
  ];

  return orderedTargetIds.map((targetId, index) => ({
    targetId,
    isVisible: rawByTargetId.get(targetId)?.isVisible ?? true,
    sortOrder: index,
  }));
}

export function agentDisplayLabel(targetId: string): string {
  return labelsByTargetId[targetId] ?? targetId;
}

export function agentDisplayShortLabel(targetId: string): string {
  return shortLabelsByTargetId[targetId] ?? agentDisplayLabel(targetId).slice(0, 2).toUpperCase();
}

export function agentMountPath(targetId: string): string {
  const suffix = globalPathSuffixByTargetId[targetId];
  if (!suffix) {
    return targetId;
  }

  return path.join(os.homedir(), suffix);
}

export function detectedAgentRows(preferences: AgentDisplayPreference[]): AgentDisplayRow[] {
  return normalizeAgentDisplayPreferences(preferences).map((preference) => ({
    targetId: preference.targetId,
    title: agentDisplayLabel(preference.targetId),
    shortLabel: agentDisplayShortLabel(preference.targetId),
    mountPath: agentMountPath(preference.targetId),
    isVisible: preference.isVisible,
  }));
}

function defaultIndex(targetId: string): number {
  const index = defaultTargetOrder.indexOf(
    targetId as (typeof defaultTargetOrder)[number],
  );
  return index === -1 ? defaultTargetOrder.length : index;
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

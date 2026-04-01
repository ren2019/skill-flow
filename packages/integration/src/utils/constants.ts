import os from "node:os";
import path from "node:path";
import type {
  DeploymentStrategy,
  DeploymentTargetName,
} from "@skill-flow/domain/types";

export const SCHEMA_VERSION = 1 as const;

export function getStateRoot(): string {
  return process.env.SKILL_FLOW_STATE_ROOT
    ? path.resolve(process.env.SKILL_FLOW_STATE_ROOT)
    : path.join(os.homedir(), ".skillflow");
}

export type TargetDefinition = {
  label: string;
  strategy: DeploymentStrategy;
  envVar: string;
  writerKey: string;
  writeRootTemplates: TargetPathTemplate[];
  compatReadRootTemplates: TargetPathTemplate[];
  writeRootCandidates: string[];
  compatReadRootCandidates: string[];
  // Reserved for future project-scope installs. Current runtime still writes via writeRootCandidates.
  documentedProjectPath?: string;
  // Mirrors the external README contract and may differ from today's runtime write root.
  documentedGlobalPath: string;
  iconAssetName?: string;
  documentedAgentIds?: string[];
};

type TargetPathTemplate = string | {
  value: string;
  platforms: NodeJS.Platform[];
};

type TargetPathOptions = {
  platform?: NodeJS.Platform;
  homeDir?: string;
};

export type TargetPathPolicy = Omit<TargetDefinition, "writeRootCandidates" | "compatReadRootCandidates"> & {
  writeRootCandidates: string[];
  compatReadRootCandidates: string[];
  documentedGlobalPath: string;
};

function currentTargetPathOptions(): Required<TargetPathOptions> {
  return {
    platform: process.platform,
    homeDir: os.homedir(),
  };
}

function isTemplateEnabled(
  template: TargetPathTemplate,
  platform: NodeJS.Platform,
): boolean {
  return typeof template === "string" || template.platforms.includes(platform);
}

function getTemplateValue(template: TargetPathTemplate): string {
  return typeof template === "string" ? template : template.value;
}

function trimTrailingSeparator(value: string, pathApi: typeof path.posix | typeof path.win32): string {
  const parsed = pathApi.parse(value);
  if (value.length <= parsed.root.length || !value.endsWith(pathApi.sep)) {
    return value;
  }

  return value.slice(0, -pathApi.sep.length);
}

function expandPathTemplate(template: string, options: Required<TargetPathOptions>): string {
  const pathApi = options.platform === "win32" ? path.win32 : path.posix;
  const normalizedTemplate = options.platform === "win32"
    ? template.replace(/\//g, "\\")
    : template.replace(/\\/g, "/");
  const normalizedHomeDir = options.platform === "win32"
    ? options.homeDir.replace(/\//g, "\\")
    : options.homeDir.replace(/\\/g, "/");
  const withHome = normalizedTemplate.replace(/^~(?=[\\/]|$)/, normalizedHomeDir);

  return trimTrailingSeparator(pathApi.normalize(withHome), pathApi);
}

function resolveTemplateCandidates(
  templates: TargetPathTemplate[],
  options: Required<TargetPathOptions>,
): string[] {
  return templates.flatMap((template) => {
    if (!isTemplateEnabled(template, options.platform)) {
      return [];
    }

    return [expandPathTemplate(getTemplateValue(template), options)];
  });
}

function defineTargetDefinition(
  definition: Omit<TargetDefinition, "writeRootCandidates" | "compatReadRootCandidates">,
): TargetDefinition {
  const options = currentTargetPathOptions();

  return {
    ...definition,
    writeRootCandidates: resolveTemplateCandidates(definition.writeRootTemplates, options),
    compatReadRootCandidates: resolveTemplateCandidates(definition.compatReadRootTemplates, options),
  };
}

export const TARGET_ORDER: DeploymentTargetName[] = [
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
];

export const TARGET_DEFINITIONS: Record<DeploymentTargetName, TargetDefinition> = {
  "claude-code": defineTargetDefinition({
    label: "Claude Code",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_CLAUDE_CODE",
    writerKey: "claude-home",
    writeRootTemplates: ["~/.claude/skills"],
    compatReadRootTemplates: [],
    documentedProjectPath: ".claude/skills/",
    documentedGlobalPath: "~/.claude/skills/",
    iconAssetName: "claude-code.svg",
  }),
  codex: defineTargetDefinition({
    label: "Codex",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_CODEX",
    writerKey: "agents-skills",
    writeRootTemplates: ["~/.codex/skills"],
    compatReadRootTemplates: [
      "~/.agents/skills",
      "~/.codex/.agents/skills",
      { value: "/etc/codex/skills", platforms: ["linux", "darwin"] },
    ],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.codex/skills/",
    iconAssetName: "codex.svg",
  }),
  cursor: defineTargetDefinition({
    label: "Cursor",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_CURSOR",
    writerKey: "cursor-home",
    writeRootTemplates: ["~/.cursor/skills"],
    compatReadRootTemplates: [
      "~/.agents/skills",
      "~/.claude/skills",
      "~/.codex/skills",
    ],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.cursor/skills/",
    iconAssetName: "cursor.svg",
  }),
  "github-copilot": defineTargetDefinition({
    label: "GitHub Copilot",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_GITHUB_COPILOT",
    writerKey: "copilot-home",
    writeRootTemplates: ["~/.copilot/skills"],
    compatReadRootTemplates: [
      "~/.claude/skills",
      "~/.agents/skills",
    ],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.copilot/skills/",
    iconAssetName: "copilot.svg",
  }),
  "gemini-cli": defineTargetDefinition({
    label: "Gemini CLI",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_GEMINI_CLI",
    writerKey: "gemini-home",
    writeRootTemplates: ["~/.gemini/skills"],
    compatReadRootTemplates: ["~/.agents/skills"],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.gemini/skills/",
    iconAssetName: "gemini.svg",
  }),
  opencode: defineTargetDefinition({
    label: "OpenCode",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_OPENCODE",
    writerKey: "opencode-home",
    writeRootTemplates: ["~/.config/opencode/skills"],
    compatReadRootTemplates: [
      "~/.opencode/skills",
      "~/.claude/skills",
      "~/.agents/skills",
    ],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.config/opencode/skills/",
    iconAssetName: "opencode.svg",
  }),
  openclaw: defineTargetDefinition({
    label: "OpenClaw",
    strategy: "copy",
    envVar: "SKILL_FLOW_TARGET_OPENCLAW",
    writerKey: "openclaw-home",
    writeRootTemplates: ["~/.openclaw/skills"],
    compatReadRootTemplates: [
      "~/.clawdbot/skills",
      "~/.moltbot/skills",
    ],
    documentedProjectPath: "skills/",
    documentedGlobalPath: "~/.openclaw/skills/",
    iconAssetName: "clawdbot.svg",
  }),
  pi: defineTargetDefinition({
    label: "Pi",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_PI",
    writerKey: "pi-home",
    writeRootTemplates: ["~/.pi/agent/skills"],
    compatReadRootTemplates: [
      "~/.agents/skills",
      "~/.claude/skills",
      "~/.codex/skills",
    ],
    documentedProjectPath: ".pi/skills/",
    documentedGlobalPath: "~/.pi/agent/skills/",
  }),
  windsurf: defineTargetDefinition({
    label: "Windsurf",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_WINDSURF",
    writerKey: "windsurf-home",
    writeRootTemplates: ["~/.codeium/windsurf/skills"],
    compatReadRootTemplates: [
      { value: "/Library/Application Support/Windsurf/skills", platforms: ["darwin"] },
    ],
    documentedProjectPath: ".windsurf/skills/",
    documentedGlobalPath: "~/.codeium/windsurf/skills/",
    iconAssetName: "windsurf.svg",
  }),
  "roo-code": defineTargetDefinition({
    label: "Roo Code",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_ROO_CODE",
    writerKey: "roo-home",
    writeRootTemplates: ["~/.roo/skills"],
    compatReadRootTemplates: [],
    documentedProjectPath: ".roo/skills/",
    documentedGlobalPath: "~/.roo/skills/",
    iconAssetName: "roo.svg",
    documentedAgentIds: ["roo"],
  }),
  cline: defineTargetDefinition({
    label: "Cline",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_CLINE",
    writerKey: "cline-home",
    writeRootTemplates: ["~/.agents/skills"],
    compatReadRootTemplates: [
      "~/.cline/skills",
      "~/.claude/skills",
    ],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.agents/skills/",
    iconAssetName: "cline.svg",
  }),
  amp: defineTargetDefinition({
    label: "Amp",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_AMP",
    writerKey: "amp-home",
    writeRootTemplates: ["~/.config/agents/skills"],
    compatReadRootTemplates: [
      "~/.config/amp/skills",
      "~/.claude/skills",
    ],
    documentedProjectPath: ".agents/skills/",
    documentedGlobalPath: "~/.config/agents/skills/",
    iconAssetName: "amp.svg",
  }),
  kiro: defineTargetDefinition({
    label: "Kiro",
    strategy: "symlink",
    envVar: "SKILL_FLOW_TARGET_KIRO",
    writerKey: "kiro-home",
    writeRootTemplates: ["~/.kiro/skills"],
    compatReadRootTemplates: [],
    documentedProjectPath: ".kiro/skills/",
    documentedGlobalPath: "~/.kiro/skills/",
    iconAssetName: "kiro-cli.svg",
    documentedAgentIds: ["kiro-cli"],
  }),
};

export const TARGET_LABELS: Record<DeploymentTargetName, string> = Object.fromEntries(
  TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].label]),
) as Record<DeploymentTargetName, string>;

export const TARGET_STRATEGIES: Record<DeploymentTargetName, DeploymentStrategy> =
  Object.fromEntries(
    TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].strategy]),
  ) as Record<DeploymentTargetName, DeploymentStrategy>;

export const TARGET_ENV_VARS: Record<DeploymentTargetName, string> = Object.fromEntries(
  TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].envVar]),
) as Record<DeploymentTargetName, string>;

export const TARGET_WRITER_KEYS: Record<DeploymentTargetName, string> = Object.fromEntries(
  TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].writerKey]),
) as Record<DeploymentTargetName, string>;

export const TARGET_PATH_CANDIDATES: Record<DeploymentTargetName, string[]> =
  Object.fromEntries(
    TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].writeRootCandidates]),
  ) as Record<DeploymentTargetName, string[]>;

export const TARGET_COMPAT_READ_CANDIDATES: Record<DeploymentTargetName, string[]> =
  Object.fromEntries(
    TARGET_ORDER.map((target) => [
      target,
      TARGET_DEFINITIONS[target].compatReadRootCandidates,
    ]),
  ) as Record<DeploymentTargetName, string[]>;

export const TARGET_DOCUMENTED_PROJECT_PATHS: Record<DeploymentTargetName, string | undefined> =
  Object.fromEntries(
    TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].documentedProjectPath]),
  ) as Record<DeploymentTargetName, string | undefined>;

export const TARGET_DOCUMENTED_GLOBAL_PATHS: Record<DeploymentTargetName, string> =
  Object.fromEntries(
    TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].documentedGlobalPath]),
  ) as Record<DeploymentTargetName, string>;

export function resolveDocumentedProjectSkillPath(
  target: DeploymentTargetName,
  projectPath: string,
): string | null {
  const normalizedProjectPath = projectPath.trim();
  if (normalizedProjectPath.length === 0) {
    return null;
  }

  const documentedProjectPath = TARGET_DEFINITIONS[target].documentedProjectPath?.trim();
  if (!documentedProjectPath) {
    return null;
  }

  const resolvedPath = path.join(normalizedProjectPath, documentedProjectPath);
  return resolvedPath.endsWith(path.sep) ? resolvedPath.slice(0, -path.sep.length) : resolvedPath;
}

export const TARGET_ICON_ASSET_NAMES: Record<DeploymentTargetName, string | undefined> =
  Object.fromEntries(
    TARGET_ORDER.map((target) => [target, TARGET_DEFINITIONS[target].iconAssetName]),
  ) as Record<DeploymentTargetName, string | undefined>;

export function getExplicitTargetNames(): DeploymentTargetName[] {
  return TARGET_ORDER.filter((target) => {
    const value = process.env[TARGET_DEFINITIONS[target].envVar]?.trim();
    return Boolean(value);
  });
}

export function isExplicitTargetMode(): boolean {
  return getExplicitTargetNames().length > 0;
}

export function getTargetDetectionCandidates(target: DeploymentTargetName): string[] {
  const definition = TARGET_DEFINITIONS[target];
  const override = process.env[definition.envVar]?.trim();

  if (isExplicitTargetMode()) {
    return override ? [override] : [];
  }

  return override ? [override] : definition.writeRootCandidates;
}

export function getTargetScanRoots(target: DeploymentTargetName): string[] {
  const definition = TARGET_DEFINITIONS[target];
  const override = process.env[definition.envVar]?.trim();

  if (isExplicitTargetMode()) {
    return override ? [override] : [];
  }

  return [
    ...new Set([
      ...(override ? [override] : []),
      ...definition.writeRootCandidates,
      ...definition.compatReadRootCandidates,
    ]),
  ];
}

export function getTargetPathPolicy(
  target: DeploymentTargetName,
  options?: TargetPathOptions,
): TargetPathPolicy {
  const definition = TARGET_DEFINITIONS[target];
  const resolvedOptions: Required<TargetPathOptions> = {
    ...currentTargetPathOptions(),
    ...options,
  };

  return {
    ...definition,
    writeRootCandidates: resolveTemplateCandidates(definition.writeRootTemplates, resolvedOptions),
    compatReadRootCandidates: resolveTemplateCandidates(
      definition.compatReadRootTemplates,
      resolvedOptions,
    ),
    documentedGlobalPath: expandPathTemplate(definition.documentedGlobalPath, resolvedOptions),
  };
}

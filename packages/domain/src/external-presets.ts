import type { ExternalSourceCommands } from "./types.js";

export type ExternalToolPreset = {
  toolName: string;
  displayName: string;
  commands: Required<Pick<ExternalSourceCommands, "install" | "update">> &
    Partial<Pick<ExternalSourceCommands, "version">>;
};

/**
 * Preset Registry: built-in defaults for well-known self-distributing tools.
 * Users may override any command at registration time.
 */
export const EXTERNAL_TOOL_PRESETS: readonly ExternalToolPreset[] = [
  {
    toolName: "agent-reach",
    displayName: "agent-reach",
    commands: {
      install: "agent-reach skill --install",
      update: "pipx upgrade agent-reach && agent-reach skill --install",
      version: "agent-reach --version",
    },
  },
];

export function findExternalToolPreset(toolName: string): ExternalToolPreset | undefined {
  return EXTERNAL_TOOL_PRESETS.find((preset) => preset.toolName === toolName);
}

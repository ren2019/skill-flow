import type { DesktopBridgeBoundary, DesktopBridgeEnvelope, BridgePayload } from "./types";

export const desktopBridgeBoundary: DesktopBridgeBoundary = {
  transport: "bridge --json",
  helperArgs: ["bridge", "--json"],
  protocolVersion: "1.0",
};

export function createDesktopBridgeEnvelope(
  command: string,
  payload?: BridgePayload,
): DesktopBridgeEnvelope {
  return {
    protocolVersion: "1.0",
    requestId: "desktop-bridge-scaffold",
    command,
    payload,
  };
}

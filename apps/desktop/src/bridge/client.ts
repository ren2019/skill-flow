import {
  PROTOCOL_VERSION,
  type BridgeCommandName,
} from "../../../../packages/shared-types/src/protocol";
import type {
  BridgePayload,
  DesktopBridgeBoundary,
  DesktopBridgeEnvelope,
} from "./types";

export const desktopBridgeBoundary: DesktopBridgeBoundary = {
  transport: "bridge --json",
  helperArgs: ["bridge", "--json"],
  protocolVersion: PROTOCOL_VERSION,
};

export function createDesktopBridgeEnvelope(
  command: BridgeCommandName,
  payload?: BridgePayload,
): DesktopBridgeEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    requestId: "desktop-bridge-scaffold",
    command,
    ...(payload === undefined ? {} : { payload }),
  };
}

import {
  PROTOCOL_VERSION,
  type BridgeCommandName,
} from "../../../../packages/shared-types/src/protocol";
import { invoke } from "@tauri-apps/api/core";
import type {
  BridgePayload,
  DesktopBridgeBoundary,
  DesktopBridgeResponse,
} from "./types";
import {
  DESKTOP_BRIDGE_HELPER_ARGS,
  DESKTOP_BRIDGE_INVOKE_COMMAND,
  createDesktopBridgeRequest,
  parseDesktopBridgeResponse,
  serializeDesktopBridgeRequest as serializeDesktopBridgeRequestPayload,
} from "./types";

export { createDesktopBridgeRequest } from "./types";

export const desktopBridgeBoundary: DesktopBridgeBoundary = {
  transport: "bridge --json",
  helperArgs: DESKTOP_BRIDGE_HELPER_ARGS,
  protocolVersion: PROTOCOL_VERSION,
};

export function serializeDesktopBridgeRequest(
  command: BridgeCommandName,
  payload?: BridgePayload,
  requestId?: string,
): string {
  return serializeDesktopBridgeRequestPayload(
    createDesktopBridgeRequest(command, payload, requestId),
  );
}

export async function invokeDesktopBridgeJson(requestJson: string): Promise<string> {
  return invoke<string>(DESKTOP_BRIDGE_INVOKE_COMMAND, { request_json: requestJson });
}

export type DesktopBridgeExecutor = (requestJson: string) => Promise<string>;

export type DesktopBridgeClient = {
  invoke(command: BridgeCommandName, payload?: BridgePayload, requestId?: string): Promise<DesktopBridgeResponse>;
};

export function createDesktopBridgeClient(
  executeBridgeJson: DesktopBridgeExecutor = invokeDesktopBridgeJson,
): DesktopBridgeClient {
  return {
    async invoke(command: BridgeCommandName, payload?: BridgePayload, requestId?: string) {
      const requestJson = serializeDesktopBridgeRequest(command, payload, requestId);
      const responseJson = await executeBridgeJson(requestJson);
      return parseDesktopBridgeResponse(responseJson);
    },
  };
}

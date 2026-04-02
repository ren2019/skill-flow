import {
  PROTOCOL_VERSION,
  type BridgeResponse,
  type BridgeCommandName,
  type BridgeRequest,
  isBridgeCommandName,
  isJsonObject,
} from "../../../../packages/shared-types/src/protocol";

export type DesktopBridgeCommand = BridgeCommandName;
export type BridgePayload = BridgeRequest["payload"];
export type DesktopBridgeResponse = BridgeResponse;

export const DESKTOP_BRIDGE_INVOKE_COMMAND = "invoke_bridge" as const;
export const DESKTOP_BRIDGE_NODE_COMMAND = "node" as const;
export const DESKTOP_BRIDGE_HELPER_ARGS = ["bridge", "--json"] as const;

export type DesktopBridgeBoundary = {
  readonly transport: "bridge --json";
  readonly helperArgs: typeof DESKTOP_BRIDGE_HELPER_ARGS;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
};

export type DesktopBridgeRequest = Pick<
  BridgeRequest,
  "protocolVersion" | "requestId" | "command" | "payload"
>;

export type DesktopBridgeShellMode = "development" | "packaged";

export type DesktopBridgeShellInvocation = {
  readonly command: typeof DESKTOP_BRIDGE_NODE_COMMAND;
  readonly args: readonly [string, ...typeof DESKTOP_BRIDGE_HELPER_ARGS];
};

export type DesktopBridgeShellConfig = {
  readonly mode: DesktopBridgeShellMode;
  readonly bundledHelperPath: string;
  readonly helperOverridePath?: string;
};

export function createDesktopBridgeRequest(
  command: DesktopBridgeCommand,
  payload?: BridgePayload,
  requestId?: string,
): DesktopBridgeRequest {
  const resolvedRequestId = requestId ?? globalThis.crypto?.randomUUID?.() ?? "desktop-bridge-request";

  return {
    protocolVersion: PROTOCOL_VERSION,
    requestId: resolvedRequestId,
    command,
    ...(payload === undefined ? {} : { payload }),
  };
}

export function serializeDesktopBridgeRequest(request: DesktopBridgeRequest): string {
  return JSON.stringify(request);
}

export function parseDesktopBridgeResponse(responseJson: string): DesktopBridgeResponse {
  const parsed: unknown = JSON.parse(responseJson);
  if (!isJsonObject(parsed)) {
    throw new Error("Desktop bridge response must be a JSON object.");
  }
  if (parsed.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error("Desktop bridge response protocol version does not match the shared protocol.");
  }
  if (!isBridgeCommandName(parsed.command)) {
    throw new Error("Desktop bridge response command is not part of the shared protocol.");
  }
  if (typeof parsed.ok !== "boolean") {
    throw new Error("Desktop bridge response requires an 'ok' flag.");
  }
  return parsed as DesktopBridgeResponse;
}

export function resolveDesktopBridgeShellInvocation(
  config: DesktopBridgeShellConfig,
): DesktopBridgeShellInvocation {
  const helperOverridePath = config.helperOverridePath?.trim();
  const helperPath =
    config.mode === "development" && helperOverridePath ? helperOverridePath : config.bundledHelperPath;

  return {
    command: DESKTOP_BRIDGE_NODE_COMMAND,
    args: [helperPath, ...DESKTOP_BRIDGE_HELPER_ARGS],
  };
}

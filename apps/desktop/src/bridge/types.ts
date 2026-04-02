import {
  PROTOCOL_VERSION,
  type BridgeCommandName,
  type BridgeRequest,
} from "../../../../packages/shared-types/src/protocol";

export type DesktopBridgeCommand = BridgeCommandName;
export type BridgePayload = BridgeRequest["payload"];

export type DesktopBridgeBoundary = {
  readonly transport: "bridge --json";
  readonly helperArgs: readonly ["bridge", "--json"];
  readonly protocolVersion: typeof PROTOCOL_VERSION;
};

export type DesktopBridgeRequest = Pick<
  BridgeRequest,
  "protocolVersion" | "requestId" | "command" | "payload"
>;

export type DesktopBridgeEnvelope = {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly requestId: string;
  readonly command: DesktopBridgeCommand;
  readonly payload?: BridgePayload;
};

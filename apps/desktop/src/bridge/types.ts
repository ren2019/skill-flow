export type BridgePayload = Record<string, unknown>;

export type DesktopBridgeBoundary = {
  readonly transport: "bridge --json";
  readonly helperArgs: readonly ["bridge", "--json"];
  readonly protocolVersion: "1.0";
};

export type DesktopBridgeEnvelope = {
  readonly protocolVersion: "1.0";
  readonly requestId: string;
  readonly command: string;
  readonly payload?: BridgePayload;
};

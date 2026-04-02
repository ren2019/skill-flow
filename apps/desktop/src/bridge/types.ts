export type BridgePayload = Record<string, unknown> | undefined;

export type BridgeInvoke = <T>(
  command: string,
  payload?: BridgePayload,
) => Promise<T>;

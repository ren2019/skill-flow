import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROTOCOL_VERSION, type BridgeResponse } from "../../../../packages/shared-types/src/protocol";
import {
  createDesktopBridgeClient,
  invokeDesktopBridgeJson,
  serializeDesktopBridgeRequest,
} from "../bridge/client";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("desktop bridge client", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("serializes bridge requests with the shared protocol version", () => {
    expect(JSON.parse(serializeDesktopBridgeRequest("list", undefined, "request-1"))).toEqual({
      protocolVersion: PROTOCOL_VERSION,
      requestId: "request-1",
      command: "list",
    });
  });

  it("invokes the dedicated Tauri bridge command for bridge JSON", async () => {
    invokeMock.mockResolvedValueOnce('{"ok":true}');

    const responseJson = await invokeDesktopBridgeJson('{"protocolVersion":"1.0"}');

    expect(invokeMock).toHaveBeenCalledWith("invoke_bridge", {
      request_json: '{"protocolVersion":"1.0"}',
    });
    expect(responseJson).toBe('{"ok":true}');
  });

  it("invokes the Tauri bridge command and parses the bridge response", async () => {
    const response: BridgeResponse = {
      protocolVersion: PROTOCOL_VERSION,
      requestId: "request-1",
      command: "list",
      ok: true,
      data: { status: "ok" },
      warnings: [],
      errors: [],
    };
    const seen: string[] = [];
    const client = createDesktopBridgeClient(async (requestJson) => {
      seen.push(requestJson);
      return JSON.stringify(response);
    });

    const result = await client.invoke("list", undefined, "request-1");

    expect(seen).toHaveLength(1);
    expect(JSON.parse(seen[0]!)).toEqual({
      protocolVersion: PROTOCOL_VERSION,
      requestId: "request-1",
      command: "list",
    });
    expect(result).toEqual(response);
  });
});

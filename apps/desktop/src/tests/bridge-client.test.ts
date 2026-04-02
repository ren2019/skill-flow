import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, type BridgeResponse } from "../../../../packages/shared-types/src/protocol";
import {
  createDesktopBridgeClient,
  serializeDesktopBridgeRequest,
} from "../bridge/client";

describe("desktop bridge client", () => {
  it("serializes bridge requests with the shared protocol version", () => {
    expect(JSON.parse(serializeDesktopBridgeRequest("list", undefined, "request-1"))).toEqual({
      protocolVersion: PROTOCOL_VERSION,
      requestId: "request-1",
      command: "list",
    });
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

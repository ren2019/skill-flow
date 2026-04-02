import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  isBridgeCommandName,
  type BridgeCommandName,
} from "../../../../packages/shared-types/src/protocol";
import { createDesktopBridgeEnvelope, desktopBridgeBoundary } from "../bridge/client";

describe("desktop bridge scaffold", () => {
  it("keeps the shell on the shared bridge protocol version", () => {
    expect(desktopBridgeBoundary.protocolVersion).toBe(PROTOCOL_VERSION);
  });

  it("models a bridge request using the shared command union", () => {
    const command: BridgeCommandName = "list";
    const request = createDesktopBridgeEnvelope(command);

    expect(desktopBridgeBoundary).toMatchObject({
      transport: "bridge --json",
      helperArgs: ["bridge", "--json"],
    });
    expect(request.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(request.requestId).toBe("desktop-bridge-scaffold");
    expect(isBridgeCommandName(request.command)).toBe(true);
  });
});

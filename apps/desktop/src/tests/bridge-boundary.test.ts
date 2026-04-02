import { describe, expect, it } from "vitest";
import { createDesktopBridgeEnvelope, desktopBridgeBoundary } from "../bridge/client";

describe("desktop bridge scaffold", () => {
  it("keeps the shell on the bridge --json boundary", () => {
    expect(desktopBridgeBoundary).toEqual({
      transport: "bridge --json",
      helperArgs: ["bridge", "--json"],
      protocolVersion: "1.0",
    });
  });

  it("models a bridge envelope without executing native commands", () => {
    expect(createDesktopBridgeEnvelope("list")).toEqual({
      protocolVersion: "1.0",
      requestId: "desktop-bridge-scaffold",
      command: "list",
      payload: undefined,
    });
  });
});

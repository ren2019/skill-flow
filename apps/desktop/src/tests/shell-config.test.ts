import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DESKTOP_BRIDGE_HELPER_ARGS,
  DESKTOP_BRIDGE_NODE_COMMAND,
  resolveDesktopBridgeShellInvocation,
} from "../bridge/types";

describe("desktop shell config", () => {
  it("prefers the bundled helper path in packaged mode", () => {
    expect(
      resolveDesktopBridgeShellInvocation({
        mode: "packaged",
        bundledHelperPath: "/Applications/Skill Flow Desktop.app/Contents/Resources/helper/dist/cli.js",
        helperOverridePath: "/tmp/skill-flow-helper",
      }),
    ).toEqual({
      command: DESKTOP_BRIDGE_NODE_COMMAND,
      args: [
        "/Applications/Skill Flow Desktop.app/Contents/Resources/helper/dist/cli.js",
        ...DESKTOP_BRIDGE_HELPER_ARGS,
      ],
    });
  });

  it("uses the helper override path in development mode", () => {
    expect(
      resolveDesktopBridgeShellInvocation({
        mode: "development",
        bundledHelperPath: "/Applications/Skill Flow Desktop.app/Contents/Resources/helper/dist/cli.js",
        helperOverridePath: "/tmp/skill-flow-helper",
      }),
    ).toEqual({
      command: DESKTOP_BRIDGE_NODE_COMMAND,
      args: ["/tmp/skill-flow-helper", ...DESKTOP_BRIDGE_HELPER_ARGS],
    });
  });

  it("bundles the cli helper into the expected packaged resource path", () => {
    const configPath = fileURLToPath(new URL("../../src-tauri/tauri.conf.json", import.meta.url));
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      bundle?: { resources?: Record<string, string> };
    };

    expect(config.bundle?.resources?.["../../cli/dist/cli.js"]).toBe("helper/dist/cli.js");
  });
});

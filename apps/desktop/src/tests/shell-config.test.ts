import { describe, expect, it } from "vitest";
import { DESKTOP_BRIDGE_HELPER_ARGS, resolveDesktopBridgeShellInvocation } from "../bridge/types";

describe("desktop shell config", () => {
  it("prefers the bundled helper path in packaged mode", () => {
    expect(
      resolveDesktopBridgeShellInvocation({
        mode: "packaged",
        bundledHelperPath: "/Applications/Skill Flow Desktop.app/Contents/Resources/bridge-helper",
        helperOverridePath: "/tmp/skill-flow-helper",
      }),
    ).toEqual({
      executablePath: "/Applications/Skill Flow Desktop.app/Contents/Resources/bridge-helper",
      args: DESKTOP_BRIDGE_HELPER_ARGS,
    });
  });

  it("uses the helper override path in development mode", () => {
    expect(
      resolveDesktopBridgeShellInvocation({
        mode: "development",
        bundledHelperPath: "/Applications/Skill Flow Desktop.app/Contents/Resources/bridge-helper",
        helperOverridePath: "/tmp/skill-flow-helper",
      }),
    ).toEqual({
      executablePath: "/tmp/skill-flow-helper",
      args: DESKTOP_BRIDGE_HELPER_ARGS,
    });
  });
});

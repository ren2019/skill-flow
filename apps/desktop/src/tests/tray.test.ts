import { describe, expect, it } from "vitest";
import { buildTrayMenuModel } from "../menu/tray";

describe("tray menu model", () => {
  it("maps quick actions to desktop routes", () => {
    expect(buildTrayMenuModel()).toEqual([
      { id: "open-home", route: { kind: "home" } },
      { id: "open-import", route: { kind: "importPage" } },
      { id: "open-settings", route: { kind: "settings" } },
    ]);
  });
});

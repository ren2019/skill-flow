import { describe, expect, it } from "vitest";
import { getRouteInventory } from "../app/routes";

describe("desktop route scaffold", () => {
  it("returns the initial route inventory", () => {
    expect(getRouteInventory()).toEqual([
      "home",
      "detail(sourceId)",
      "importPage",
      "settings",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildTrayMenuModel,
  resolveTrayRoute,
  registerTrayRouteListener,
  TRAY_ROUTE_EVENT,
} from "../menu/tray";

describe("tray menu model", () => {
  it("maps quick actions to desktop routes", () => {
    expect(buildTrayMenuModel()).toEqual([
      { id: "open-quick-config", route: { kind: "menuQuickConfig" } },
      { id: "open-home", route: { kind: "home" } },
      { id: "open-import", route: { kind: "importPage" } },
      { id: "open-settings", route: { kind: "settings" } },
    ]);
  });

  it("resolves tray menu ids back into desktop routes", () => {
    expect(resolveTrayRoute("open-quick-config")).toEqual({ kind: "menuQuickConfig" });
    expect(resolveTrayRoute("open-home")).toEqual({ kind: "home" });
    expect(resolveTrayRoute("open-import")).toEqual({ kind: "importPage" });
    expect(resolveTrayRoute("open-settings")).toEqual({ kind: "settings" });
    expect(resolveTrayRoute("unknown")).toBeUndefined();
  });

  it("subscribes to tray route events and ignores unknown ids", async () => {
    const routes: Array<{ kind: string }> = [];
    let handler: ((event: { payload: string }) => void) | undefined;

    const unlisten = await registerTrayRouteListener(
      (route) => {
        routes.push(route);
      },
      async (eventName, callback) => {
        expect(eventName).toBe(TRAY_ROUTE_EVENT);
        handler = callback;
        return () => undefined;
      },
    );

    handler?.({ payload: "open-import" });
    handler?.({ payload: "unknown" });
    handler?.({ payload: "open-quick-config" });
    handler?.({ payload: "open-settings" });
    await unlisten();

    expect(routes).toEqual([{ kind: "importPage" }, { kind: "menuQuickConfig" }, { kind: "settings" }]);
  });

  it("maps tray quick actions to the same route inventory as the macOS app", () => {
    expect(buildTrayMenuModel().map((item) => item.id)).toEqual([
      "open-quick-config",
      "open-home",
      "open-import",
      "open-settings",
    ]);
    expect(buildTrayMenuModel().map((item) => item.route.kind)).toEqual([
      "menuQuickConfig",
      "home",
      "importPage",
      "settings",
    ]);
  });

  it("keeps quick-config entry behavior aligned with the intended current cutover scope", () => {
    expect(resolveTrayRoute("open-quick-config")).toEqual({ kind: "menuQuickConfig" });
    expect(resolveTrayRoute("open-home")).toEqual({ kind: "home" });
    expect(resolveTrayRoute("open-import")).toEqual({ kind: "importPage" });
    expect(resolveTrayRoute("open-settings")).toEqual({ kind: "settings" });
    expect(resolveTrayRoute("open-detail")).toBeUndefined();
    expect(resolveTrayRoute("quit")).toBeUndefined();
  });
});

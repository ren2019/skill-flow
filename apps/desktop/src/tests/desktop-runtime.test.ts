import { describe, expect, it } from "vitest";
import { desktopRoute } from "../navigation/desktop-route";
import { DesktopRuntime } from "../runtime/desktop-runtime";

describe("desktop runtime", () => {
  it("marks home bootstrap ready after loading inventory", async () => {
    const runtime = new DesktopRuntime({
      bootstrap: async () => ["alpha", "beta"],
    });

    await runtime.bootstrapIfNeeded();

    expect(runtime.state.asyncResources.homeBootstrapPhase).toEqual({ kind: "ready" });
    expect(runtime.state.workspace.sourceIds).toEqual(["alpha", "beta"]);
    expect(runtime.state.view.selectedSourceId).toBe("alpha");
  });

  it("returns immediately while bootstrap is already loading", async () => {
    let resolveBootstrap: ((sourceIds: string[]) => void) | undefined;
    let bootstrapCallCount = 0;
    const runtime = new DesktopRuntime({
      bootstrap: async () => {
        bootstrapCallCount += 1;
        return new Promise<string[]>((resolve) => {
          resolveBootstrap = resolve;
        });
      },
    });

    const firstBootstrap = runtime.bootstrapIfNeeded();

    expect(runtime.state.asyncResources.homeBootstrapPhase).toEqual({ kind: "loading" });

    await runtime.bootstrapIfNeeded();

    expect(bootstrapCallCount).toBe(1);
    expect(runtime.state.asyncResources.homeBootstrapPhase).toEqual({ kind: "loading" });

    resolveBootstrap?.(["alpha"]);
    await firstBootstrap;

    expect(runtime.state.asyncResources.homeBootstrapPhase).toEqual({ kind: "ready" });
    expect(runtime.state.workspace.sourceIds).toEqual(["alpha"]);
  });

  it("normalizes detail source ids without any extra runtime step", () => {
    const runtime = new DesktopRuntime({
      bootstrap: async () => [],
    });

    runtime.showDetail("  alpha  ");

    expect(runtime.state.view.selectedSourceId).toBe("alpha");
    expect(runtime.state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
  });
});

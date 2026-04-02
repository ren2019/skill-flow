import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { createDesktopAppState } from "../store/desktop-app-state";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("desktop smoke", () => {
  it("wires the home refresh action through the shared integration hook", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });

    const refreshInventory = vi.fn(async () => {
      state.workspace.sourceIds = ["alpha", "beta"];
    });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(App, {
        state,
        integration: { refreshInventory },
      }));
    });

    const refreshButton = renderer!.root
      .findAllByType("button")
      .find((button) => button.children.includes("Refresh"));
    await act(async () => {
      await refreshButton!.props.onClick();
    });

    expect(refreshInventory).toHaveBeenCalledTimes(1);
    expect(state.workspace.sourceIds).toEqual(["alpha", "beta"]);
  });
});

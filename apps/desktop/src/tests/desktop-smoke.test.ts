import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { createDesktopAppState } from "../store/desktop-app-state";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("desktop smoke", () => {
  it("wires import completion through the shared integration hook", async () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "importPage" },
      },
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
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

    const importButton = renderer!.root.findByProps({ "data-import-group-id": "starter" });
    await act(async () => {
      await importButton.props.onClick();
    });

    expect(refreshInventory).toHaveBeenCalledTimes(1);
    expect(state.workspace.sourceIds).toEqual(["alpha", "beta"]);
  });
});

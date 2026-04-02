import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { createDesktopAppState } from "../store/desktop-app-state";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createDesktopIntegrationMock } = vi.hoisted(() => ({
  createDesktopIntegrationMock: vi.fn((state: { workspace: { sourceIds: string[] } }) => ({
    refreshInventory: vi.fn(async () => {
      state.workspace.sourceIds = ["alpha", "starter"];
    }),
  })),
}));

vi.mock("../runtime/desktop-integration", () => ({
  createDesktopIntegration: createDesktopIntegrationMock,
}));

describe("desktop integration", () => {
  it("creates the default integration path when no integration is injected", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      view: {
        currentRoute: { kind: "importPage" },
      },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
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

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(App, {
        state,
      }));
    });

    const importButton = renderer!.root.findByProps({ "data-import-group-id": "starter" });
    await act(async () => {
      await importButton.props.onClick();
    });

    expect(createDesktopIntegrationMock).toHaveBeenCalledTimes(1);
    expect(state.workspace.sourceIds).toEqual(["alpha", "starter"]);
  });
});

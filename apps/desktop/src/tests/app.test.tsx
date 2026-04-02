import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { App } from "../app/App";
import { createDesktopAppState } from "../store/desktop-app-state";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("app", () => {
  it("rerenders the shell when home navigation opens a detail route", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: [],
            fileTree: [],
            groupDocuments: [],
            targets: [],
            skills: [],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "empty",
            targetSelection: "empty",
          },
        },
      },
    });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<App state={state} />);
    });

    const openButton = renderer!.root.findByProps({ "data-source-id": "alpha" });
    await act(async () => {
      openButton.props.onClick();
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Source Detail");
    expect(text).toContain("Alpha");
    expect(text).toContain("Current route: detail");
  });
});

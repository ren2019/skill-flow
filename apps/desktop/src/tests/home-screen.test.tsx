import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { createDesktopAppState } from "../store/desktop-app-state";
import { HomeViewModel } from "../view-models/home-view-model";
import { HomeScreen } from "../screens/home-screen";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("home screen", () => {
  it("renders installed inventory groups and source ids", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"], pinnedSourceIds: ["beta"] },
      settings: {
        selectedProjectScope: { kind: "project", projectId: "repo-a" },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("Installed Skills");
    expect(markup).toContain("alpha");
    expect(markup).toContain("beta");
    expect(markup).toContain("Refresh");
    expect(markup).toContain("Update All");
    expect(markup).toContain("Pinned");
    expect(markup).toContain("repo-a");
  });

  it("renders a loading state while bootstrap is in flight", () => {
    const state = createDesktopAppState({
      asyncResources: {
        homeBootstrapPhase: { kind: "loading" },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("Loading workspace");
  });

  it("renders the home toast message when present", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      view: {
        toastMessage: "No group selected.",
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("No group selected.");
  });

  it("wires refresh, update-all, pin, and project scope actions", async () => {
    const refreshList = vi.fn().mockResolvedValue(undefined);
    const updateGroup = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"] },
      settings: {
        recentProjectScopes: [
          {
            projectId: "repo-a",
            title: "Repo A",
            lastActivityAt: "2026-04-02T10:00:00Z",
            tools: ["codex"],
          },
        ],
      },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new HomeViewModel(state, {
          refreshList,
          updateGroup,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <HomeScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const buttons = renderer!.root.findAllByType("button");
    const refreshButton = buttons.find((button) => button.children.includes("Refresh"));
    const updateAllButton = buttons.find((button) => button.children.includes("Update All"));
    const pinButton = renderer!.root.findByProps({ "data-pin-source-id": "alpha" });
    const projectButton = renderer!.root.findByProps({ "data-project-scope": "global" });
    const recentProjectButton = renderer!.root.findByProps({ "data-project-scope": "project:repo-a" });

    await act(async () => {
      refreshButton!.props.onClick();
      await updateAllButton!.props.onClick();
      pinButton.props.onClick();
      await projectButton.props.onClick();
      await recentProjectButton.props.onClick();
    });

    expect(refreshList).toHaveBeenCalledTimes(1);
    expect(updateGroup.mock.calls).toEqual([["alpha"], ["beta"]]);
    expect(state.workspace.pinnedSourceIds).toEqual(["alpha"]);
    expect(state.settings.selectedProjectScope).toEqual({ kind: "project", projectId: "repo-a" });
  });
});

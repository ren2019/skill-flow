import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { createDesktopAppState } from "../store/desktop-app-state";
import { HomeViewModel } from "../view-models/home-view-model";
import { HomeScreen } from "../screens/home-screen";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("home screen", () => {
  it("renders the home top bar with app title, search, and primary actions", () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta"],
        pinnedSourceIds: ["beta"],
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 3,
            enabledSkillCount: 2,
            activeTargetCount: 2,
            byline: "by obra",
            downloadCount: 5045,
            starCount: 1200,
            repoUrl: "https://github.com/obra/alpha",
            groupPath: "/groups/alpha",
            enabledTargetLabels: ["Codex", "Claude Code"],
            selectedSkillNames: ["browse", "review"],
            skillSelection: "partial",
            targetSelection: "full",
            skills: [
              { id: "alpha:browse", title: "browse", isEnabled: true },
              { id: "alpha:review", title: "review", isEnabled: true },
              { id: "alpha:ship", title: "ship", isEnabled: false },
            ],
            targets: [
              { id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true },
              { id: "claude-code", label: "Claude Code", shortLabel: "CC", isEnabled: true },
            ],
          },
          {
            sourceId: "beta",
            title: "Beta Tools",
            locator: "obra/beta",
            health: "PARTIAL",
            warningCount: 1,
            errorCount: 0,
            skillCount: 2,
            enabledSkillCount: 1,
            activeTargetCount: 1,
            byline: "by beta",
            groupPath: "/groups/beta",
            enabledTargetLabels: ["Cursor"],
            selectedSkillNames: ["ship"],
          },
        ],
      },
      settings: {
        selectedProjectScope: { kind: "project", projectId: "repo-a" },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("Skill Flow");
    expect(markup).toContain("Search groups or authors");
    expect(markup).toContain("Import");
    expect(markup).toContain("Settings");
    expect(markup).toContain("data-view=\"home-top-bar\"");
    expect(markup).toContain("data-view=\"home-brand\"");
    expect(markup).toContain("data-menu-bar-icon=\"true\"");
    expect(markup).toContain("data-action-icon=\"project\"");
    expect(markup).toContain("data-action-icon=\"import\"");
    expect(markup).toContain("data-action-icon=\"settings\"");
    expect(markup).toContain("data-view=\"home-card-grid\"");
    expect(markup).toContain("data-view=\"shared-group-card\"");
    expect(markup).toContain("data-view=\"shared-group-card-header\"");
    expect(markup).toContain("data-view=\"shared-group-card-stats\"");
    expect(markup).toContain("data-view=\"shared-group-card-agents\"");
    expect(markup).toContain("data-view=\"shared-group-card-skills\"");
    expect(markup).toContain("data-group-card-stat=\"download\"");
    expect(markup).toContain("data-group-card-stat=\"star\"");
    expect(markup).toContain("data-group-card-stat=\"github\"");
    expect(markup).toContain("data-group-card-stat=\"local-file\"");
    expect(markup).toContain("data-delete-source-id=\"alpha\"");
    expect(markup).toContain("data-skill-toggle-id=\"alpha:alpha:browse\"");
    expect(markup).toContain("data-target-toggle-id=\"alpha:codex\"");
    expect(markup).toContain("Alpha Starter");
    expect(markup).toContain("Beta Tools");
    expect(markup).toContain("by obra");
    expect(markup).toContain("3 skills");
    expect(markup).toContain("2 active targets");
    expect(markup).toContain("Pinned");
    expect(markup).toContain("Codex");
    expect(markup).toContain("browse");
    expect(markup).not.toContain("Current route");
  });

  it("keeps project scope controls in the shared home content", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      settings: {
        selectedProjectScope: { kind: "project", projectId: "repo-a" },
        recentProjectScopes: [
          {
            projectId: "repo-a",
            title: "Repo A",
            lastActivityAt: "2026-04-02T10:00:00Z",
            tools: ["codex"],
          },
        ],
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("data-action-icon=\"project\"");
    expect(markup).not.toContain("Current route");
  });

  it("renders the home tag filter bar and filters visible cards", async () => {
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha", "beta"],
        customTagsBySourceId: {
          alpha: [{ id: "official", title: "Official" }],
          beta: [{ id: "community", title: "Community" }],
        },
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 3,
            enabledSkillCount: 2,
            activeTargetCount: 2,
          },
          {
            sourceId: "beta",
            title: "Beta Tools",
            locator: "obra/beta",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 2,
            enabledSkillCount: 1,
            activeTargetCount: 1,
          },
        ],
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new HomeViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <HomeScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    expect(renderer!.root.findAllByProps({ "data-view": "home-tag-filter-bar" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);

    const officialTag = renderer!.root.findByProps({ "data-home-tag-filter": "official" });
    expect(renderer!.root.findAllByProps({ "data-view": "home-filter-divider" })).toHaveLength(1);
    await act(async () => {
      officialTag.props.onClick();
    });

    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(0);
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

    expect(markup).toContain("data-view=\"home-top-bar\"");
    expect(markup).toContain("data-view=\"home-loading-state\"");
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

  it("renders the empty state inside the shared home shell", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: [] },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("data-view=\"home-top-bar\"");
    expect(markup).toContain("data-view=\"home-empty-state\"");
    expect(markup).not.toContain("</main><p>");
  });

  it("wires pin and project scope actions", async () => {
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
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <HomeScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const pinButton = renderer!.root.findByProps({ "data-pin-source-id": "alpha" });
    const scopeToggleButton = renderer!.root.findByProps({ "data-testid": "home-scope-toggle" });

    await act(async () => {
      scopeToggleButton.props.onClick();
    });

    const projectButton = renderer!.root.findByProps({ "data-project-scope": "global" });
    const recentProjectButton = renderer!.root.findByProps({ "data-project-scope": "project:repo-a" });

    await act(async () => {
      pinButton.props.onClick();
      await projectButton.props.onClick();
      await recentProjectButton.props.onClick();
    });

    expect(state.workspace.pinnedSourceIds).toEqual(["alpha"]);
    expect(state.settings.selectedProjectScope).toEqual({ kind: "project", projectId: "repo-a" });
  });

  it("wires the group delete action", async () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"], pinnedSourceIds: ["alpha"] },
      asyncResources: {
        homeBootstrapPhase: { kind: "ready" },
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new HomeViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <HomeScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const deleteButton = renderer!.root.findByProps({ "data-delete-source-id": "alpha" });

    await act(async () => {
      deleteButton.props.onClick();
      await Promise.resolve();
    });

    expect(state.workspace.sourceIds).toEqual(["beta"]);
    expect(state.workspace.pinnedSourceIds).toEqual([]);
    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);
  });

  it("wires home card skill and target toggles", async () => {
    const updateSelection = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      workspace: {
        sourceIds: ["alpha"],
        inventorySummaries: [
          {
            sourceId: "alpha",
            title: "Alpha Starter",
            locator: "obra/alpha",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 2,
            enabledSkillCount: 1,
            activeTargetCount: 0,
            skillSelection: "partial",
            targetSelection: "empty",
            skills: [
              { id: "alpha:browse", title: "browse", isEnabled: true },
              { id: "alpha:review", title: "review", isEnabled: false },
            ],
            targets: [
              { id: "codex", label: "Codex", shortLabel: "CX", isEnabled: false },
            ],
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
          updateSelection,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <HomeScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-skill-toggle-id": "alpha:alpha:review" }).props.onClick();
    });
    await act(async () => {
      renderer!.root.findByProps({ "data-target-toggle-id": "alpha:codex" }).props.onClick();
    });

    expect(updateSelection).toHaveBeenCalledTimes(2);
    expect(state.workspace.inventorySummaries[0].enabledSkillCount).toBe(2);
    expect(state.workspace.inventorySummaries[0].activeTargetCount).toBe(1);
  });

  it("filters the inventory list and toggles the project scope bar", async () => {
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
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new HomeViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <HomeScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-view": "home-project-scope-bar" })).toHaveLength(0);

    const searchInput = renderer!.root.findByProps({ "data-testid": "home-search-input" });
    const scopeToggleButton = renderer!.root.findByProps({ "data-testid": "home-scope-toggle" });

    await act(async () => {
      searchInput.props.onChange({ target: { value: "beta" } });
    });

    expect(renderer!.root.findAllByProps({ "data-source-id": "alpha" })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ "data-source-id": "beta" })).toHaveLength(1);

    await act(async () => {
      scopeToggleButton.props.onClick();
    });

    expect(renderer!.root.findAllByProps({ "data-view": "home-project-scope-bar" })).toHaveLength(1);
  });
});

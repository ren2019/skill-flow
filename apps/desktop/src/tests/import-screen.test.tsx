import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { createDesktopAppState } from "../store/desktop-app-state";
import { autoPreviewTaskKey, ImportScreen, previewGroupIds } from "../screens/import-screen";
import { ImportViewModel } from "../view-models/import-view-model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("import screen", () => {
  it("keeps import screen search text and placeholder state across route round-trips", async () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "importPage" },
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const searchInput = renderer!.root.findByProps({ "data-testid": "import-search-input" });
    await act(async () => {
      searchInput.props.onChange({ target: { value: "anthropic/skills" } });
    });

    expect(searchInput.props.value).toBe("anthropic/skills");

    await act(async () => {
      state.view.currentRoute = { kind: "home" };
      renderer!.update(<Harness />);
    });
    await act(async () => {
      state.view.currentRoute = { kind: "importPage" };
      renderer!.update(<Harness />);
    });

    const restoredInput = renderer!.root.findByProps({ "data-testid": "import-search-input" });
    expect(restoredInput.props.value).toBe("anthropic/skills");
    expect(restoredInput.props.placeholder).toBe("search packages, authors, repos");
  });

  it("renders the route top bar and routes the back button home", async () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "importPage" },
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    expect(renderer!.root.findAllByProps({ "data-view": "desktop-route-title" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-view": "import-search-shell" })).toHaveLength(1);
    await act(async () => {
      renderer!.root.findByProps({ "data-action-icon": "back" }).props.onClick();
    });

    expect(state.view.currentRoute).toEqual({ kind: "home" });
  });


  it("renders recommendation rails when no query is submitted", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            downloadCount: 1200,
            starCount: 42,
            repoUrl: "https://github.com/obra/starter",
            categoryId: "featured",
            categoryTitle: "Featured",
            recommendationDescription: "Development starter",
            recommendationBadgeItems: [
              { id: "development", title: "Development", isPrimary: true },
            ],
            previewPhase: { kind: "ready" },
            skills: [
              { id: "skill-a", selectedByDefault: true },
              { id: "skill-b", selectedByDefault: true },
            ],
            targets: [
              { id: "codex", selectedByDefault: true },
              { id: "claude-code", selectedByDefault: true },
            ],
          },
        ],
        draftsByItemId: {
          starter: {
            selectedSkillIds: ["skill-a", "skill-b"],
            enabledTargetIds: ["codex", "claude-code"],
          },
        },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen viewModel={new ImportViewModel(state)} />,
    );

    expect(markup).toContain("Import");
    expect(markup).toContain("data-view=\"import-page\"");
    expect(markup).toContain("data-view=\"recommendation-rails\"");
    expect(markup).toContain("data-view=\"import-rail\"");
    expect(markup).toContain("data-card-display-mode=\"importRecommendation\"");
    expect(markup).toContain("data-view=\"shared-group-card-recommendation-summary\"");
    expect(markup).toContain("data-group-card-stat=\"download\"");
    expect(markup).toContain("data-group-card-stat=\"star\"");
    expect(markup).toContain("data-group-card-stat=\"github\"");
    expect(markup).toContain("1.2k");
    expect(markup).toContain("Featured");
    expect(markup).toContain("starter");
    expect(markup).toContain("Development starter");
    expect(markup).toContain("#Development");
    expect(markup).toContain("skill-a");
    expect(markup).toContain("codex");
  });

  it("routes recommendation repository icons through the import view model opener", async () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "openai/starter",
            repoUrl: "https://github.com/openai/starter",
            categoryId: "featured",
            categoryTitle: "Featured",
            previewPhase: { kind: "ready" },
            skills: [],
            targets: [],
          },
        ],
      },
    });
    const openExternalUrl = vi.fn().mockResolvedValue(undefined);
    const viewModel = new ImportViewModel(state, { openExternalUrl });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<ImportScreen viewModel={viewModel} />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-group-card-stat-action": "github" }).props.onClick();
    });

    expect(openExternalUrl.mock.calls).toEqual([["https://github.com/openai/starter"]]);
  });

  it("renders a centered empty state for failed import search", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "openai",
        importSearchPhase: {
          kind: "failed",
          message: "Network unavailable",
        },
        searchGroups: [],
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen viewModel={new ImportViewModel(state)} />,
    );

    expect(markup).toContain("Network unavailable");
    expect(markup).toContain("Import search failed");
    expect(markup).toContain("data-view=\"import-centered-state\"");
  });

  it("loads recommendations on mount and supports preview plus search flows", async () => {
    const state = createDesktopAppState();
    const searchLoader = vi.fn().mockResolvedValue([
      {
        id: "search-result",
        title: "Search Result",
        locator: "openai/result",
        previewPhase: { kind: "ready" as const },
        skills: [{ id: "skill-b", selectedByDefault: true }],
        targets: [{ id: "cursor", selectedByDefault: true }],
      },
    ]);
    const previewLoader = vi.fn().mockResolvedValue({
      skills: [{ id: "skill-a", selectedByDefault: true }],
      targets: [{ id: "codex", selectedByDefault: true }],
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          recommendationsLoader: () => [
            {
              id: "starter",
              title: "Starter",
              locator: "obra/starter",
              categoryId: "development",
              categoryTitle: "Development",
            },
          ],
          previewLoader,
          searchLoader,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    expect(state.importState.recommendedGroups.map((group) => group.id)).toEqual(["starter"]);

    await act(async () => {
      await Promise.resolve();
    });
    expect(previewLoader).toHaveBeenCalledWith("starter");
    expect(state.importState.recommendedGroups[0].skills.map((skill) => skill.id)).toEqual(["skill-a"]);

    const searchInput = renderer!.root.findByProps({ "data-testid": "import-search-input" });
    const searchButton = renderer!.root.findByProps({ "data-testid": "import-search-submit" });
    await act(async () => {
      searchInput.props.onChange({ target: { value: "openai" } });
    });
    await act(async () => {
      await searchButton.props.onClick();
    });

    expect(searchLoader).toHaveBeenCalledWith("openai");
    expect(state.importState.importSubmittedQuery).toBe("openai");
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("search-result");
    expect(text).toContain("skill-b");
    expect(text).toContain("import-search-grid");
  });

  it("auto-previews every rendered idle card instead of only the first few", async () => {
    const state = createDesktopAppState({
      importState: {
        recommendedGroups: Array.from({ length: 6 }, (_, index) => ({
          id: `card-${index}`,
          title: `Card ${index}`,
          locator: `owner/repo-${index}`,
          previewPhase: { kind: "idle" as const },
          skills: [],
          targets: [],
        })),
      },
    });
    const previewLoader = vi.fn().mockResolvedValue({
      skills: [{ id: "skill-a", selectedByDefault: true }],
      targets: [{ id: "codex", selectedByDefault: true }],
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          previewLoader,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    await act(async () => {
      create(<Harness />);
    });

    expect(previewLoader.mock.calls.map(([groupId]) => groupId)).toEqual([
      "card-0",
      "card-1",
      "card-2",
      "card-3",
      "card-4",
      "card-5",
    ]);
  });

  it("derives auto preview task keys from all idle groups", () => {
    const groups = [
      {
        id: "ready-card",
        title: "Ready",
        locator: "owner/ready",
        previewPhase: { kind: "ready" as const },
        skills: [],
        targets: [],
      },
      {
        id: "idle-card",
        title: "Idle",
        locator: "owner/idle",
        previewPhase: { kind: "idle" as const },
        skills: [],
        targets: [],
      },
    ];

    expect(previewGroupIds(groups)).toEqual(["idle-card"]);
    expect(autoPreviewTaskKey(["idle-card"], "browse")).toBe("browse|idle-card");
  });

  it("renders import actions for search result cards", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "search" });
    const state = createDesktopAppState();

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          searchLoader: async () => [
            {
              id: "search",
              title: "Search",
              locator: "openai/skills",
              downloadCount: 5045,
              starCount: 88,
              repoUrl: "https://github.com/openai/skills",
              previewPhase: { kind: "ready" as const },
              skills: [{ id: "ship", selectedByDefault: true }],
              targets: [{ id: "cursor", selectedByDefault: true }],
            },
          ],
          importer,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });
    const searchInput = renderer!.root.findByProps({ "data-testid": "import-search-input" });
    const searchButton = renderer!.root.findByProps({ "data-testid": "import-search-submit" });
    await act(async () => {
      searchInput.props.onChange({ target: { value: "openai" } });
    });
    await act(async () => {
      await searchButton.props.onClick();
    });
    const importButton = renderer!.root.findByProps({ "data-import-group-id": "search" });
    await act(async () => {
      await importButton.props.onClick();
    });

    expect(importer).toHaveBeenCalledWith("search", {
      selectedSkillIds: ["ship"],
      enabledTargets: [],
    });
    expect(state.importState.searchGroups[0].isInstalledLocally).toBe(true);
  });

  it("updates import card drafts through shared card toggles before importing", async () => {
    const importer = vi.fn().mockResolvedValue({ sourceId: "search" });
    const state = createDesktopAppState({
      importState: {
        recommendedGroups: [
          {
            id: "search",
            title: "Search",
            locator: "openai/skills",
            previewPhase: { kind: "ready" as const },
            skills: [
              { id: "ship", title: "Ship", selectedByDefault: true },
              { id: "review", title: "Review", selectedByDefault: true },
            ],
            targets: [
              { id: "codex", selectedByDefault: false },
              { id: "cursor", selectedByDefault: false },
            ],
          },
        ],
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          importer,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-skill-toggle-id": "search:ship" }).props.onClick();
      renderer!.root.findByProps({ "data-target-toggle-id": "search:codex" }).props.onClick();
    });
    await act(async () => {
      await renderer!.root.findByProps({ "data-import-group-id": "search" }).props.onClick();
    });

    expect(importer).toHaveBeenCalledWith("search", {
      selectedSkillIds: ["review"],
      enabledTargets: ["codex"],
    });
  });

  it("syncs the search input back to the shared query after the page resets", async () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "openai",
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new ImportViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <ImportScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const searchInput = renderer!.root.findByProps({ "data-testid": "import-search-input" });
    expect(searchInput.props.value).toBe("");
  });

  it("projects recommendation and search business state exactly from shared import state", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "openai",
        importSearchPhase: { kind: "loading" },
        recommendedGroups: [
          {
            id: "recommended",
            title: "Recommended",
            locator: "anthropic/skills",
            categoryId: "general",
            categoryTitle: "General",
            previewPhase: { kind: "ready" },
            skills: [{ id: "browse", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
        searchGroups: [
          {
            id: "search",
            title: "Search",
            locator: "openai/skills",
            previewPhase: { kind: "ready" },
            skills: [{ id: "ship", selectedByDefault: true }],
            targets: [{ id: "cursor", selectedByDefault: true }],
          },
        ],
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen viewModel={new ImportViewModel(state)} />,
    );

    expect(markup).toContain("data-view=\"import-search-loading\"");
    expect(markup).toContain("search");
    expect(markup).not.toContain("recommended");
  });

  it("disables the import action for groups that already exist locally", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            isInstalledLocally: true,
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen viewModel={new ImportViewModel(state)} />,
    );

    expect(markup).toContain("Installed");
    expect(markup).toContain("disabled=\"\"");
  });

  it("falls back to visible targets when no preview target draft is available", () => {
    const state = createDesktopAppState({
      settings: {
        agentDisplayPreferences: [
          { targetId: "cursor", isVisible: true, sortOrder: 0 },
          { targetId: "codex", isVisible: true, sortOrder: 1 },
          { targetId: "claude-code", isVisible: false, sortOrder: 2 },
        ],
      },
      workspace: {
        inventorySummaries: [
          {
            sourceId: "installed",
            title: "Installed",
            locator: "local/installed",
            health: "HEALTHY",
            warningCount: 0,
            errorCount: 0,
            skillCount: 1,
            enabledSkillCount: 1,
            activeTargetCount: 3,
            targets: [
              { id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true },
              { id: "cursor", label: "Cursor", shortLabel: "CU", isEnabled: true },
              { id: "claude-code", label: "Claude Code", shortLabel: "CC", isEnabled: true },
            ],
          },
        ],
      },
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "loading" },
            skills: [],
            targets: [],
          },
        ],
        draftsByItemId: {
          starter: {
            selectedSkillIds: [],
            enabledTargetIds: [],
          },
        },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen viewModel={new ImportViewModel(state)} />,
    );

    expect(markup).toContain("Codex");
    expect(markup).toContain("Cursor");
    expect(markup).not.toContain("Claude Code");
    expect(markup).toContain("data-view=\"shared-group-card-loading-pill\"");
    expect(markup).toContain("data-group-card-stat-placeholder=\"download\"");
  });
});

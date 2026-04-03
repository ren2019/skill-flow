import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { createDesktopAppState } from "../store/desktop-app-state";
import { ImportScreen } from "../screens/import-screen";
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
    expect(renderer!.root.findByProps({ "data-placeholder-index": 0 })).toBeDefined();
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
            categoryId: "featured",
            categoryTitle: "Featured",
            recommendationDescription: "Development starter",
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

    expect(markup).toContain("Import Sources");
    expect(markup).toContain("data-view=\"import-page\"");
    expect(markup).toContain("data-view=\"recommendation-rails\"");
    expect(markup).toContain("data-view=\"import-rail\"");
    expect(markup).toContain("Featured");
    expect(markup).toContain("starter");
    expect(markup).toContain("skill-a");
    expect(markup).toContain("codex");
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
    expect(markup).toContain("No groups found");
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

    const previewButton = renderer!.root.findByProps({ "data-preview-group-id": "starter" });
    await act(async () => {
      await previewButton.props.onClick();
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
    expect(text).toContain("Search Results");
    expect(text).toContain("search-result");
    expect(text).toContain("skill-b");
    expect(text).toContain("import-search-grid");
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

    expect(markup).toContain("Search Results");
    expect(markup).toContain("openai");
    expect(markup).toContain("Loading");
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
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "loading" },
            skills: [],
            targets: [
              { id: "claude-code", selectedByDefault: true },
              { id: "cursor", selectedByDefault: true },
            ],
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

    expect(markup).toContain("claude-code");
    expect(markup).toContain("cursor");
  });
});

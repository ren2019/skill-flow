import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { createDesktopAppState } from "../store/desktop-app-state";
import { ImportScreen } from "../screens/import-screen";
import { ImportViewModel } from "../view-models/import-view-model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("import screen", () => {
  it("renders recommendation and import draft sections", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "",
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            categoryId: "development",
            categoryTitle: "Development",
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
    expect(markup).toContain("Recommended Imports");
    expect(markup).toContain("Development");
    expect(markup).toContain("starter");
    expect(markup).toContain("skill-a");
    expect(markup).toContain("codex");
  });

  it("renders search results when the submitted query is non-empty", () => {
    const state = createDesktopAppState({
      importState: {
        importSubmittedQuery: "openai",
        searchGroups: [
          {
            id: "search-result",
            title: "Search Result",
            locator: "openai/result",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-b", selectedByDefault: true }],
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
    expect(markup).toContain("search-result");
    expect(markup).toContain("skill-b");
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
  });
});

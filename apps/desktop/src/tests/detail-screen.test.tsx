import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { desktopRoute } from "../navigation/desktop-route";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DetailScreen } from "../screens/detail-screen";
import { DetailViewModel } from "../view-models/detail-view-model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("detail screen", () => {
  it("renders the selected source id and a markdown document placeholder", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: ["Claude Code", "Codex"],
            fileTree: [
              {
                id: "root/skill-a",
                title: "skill-a",
                path: "/alpha/skill-a",
                isDirectory: true,
                isSkillRoot: true,
                isSkillDocument: false,
                skillId: "skill-a",
                children: [],
              },
            ],
            groupDocuments: [
              {
                id: "readme",
                title: "README.md",
                path: "README.md",
                metadata: [],
                renderCacheKey: "readme",
                content: "# Alpha",
                isLoaded: true,
              },
            ],
            targets: [],
            skills: [
              {
                id: "skill-a",
                title: "Browse",
                isEnabled: true,
                documents: [],
              },
            ],
            sourceFacts: ["Updated yesterday"],
            deploymentFacts: ["Claude Code -> ~/.claude"],
            skillSelection: "partial",
            targetSelection: "full",
          },
        },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("Source Detail");
    expect(markup).toContain("Alpha");
    expect(markup).toContain("README");
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("skill-a");
    expect(markup).toContain("# Alpha");
  });

  it("renders an empty detail state when no source is selected", () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(createDesktopAppState())} />,
    );

    expect(markup).toContain("No source selected");
  });

  it("renders the detail toast message when present", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
        toastMessage: "save failed",
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

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("save failed");
  });

  it("wires overview, skill, tree, and document selections", async () => {
    const updateSelection = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: ["Claude Code"],
            fileTree: [
              {
                id: "root/skill-a",
                title: "skill-a",
                path: "/alpha/skill-a",
                isDirectory: true,
                isSkillRoot: true,
                isSkillDocument: false,
                skillId: "skill-a",
                children: [],
              },
            ],
            groupDocuments: [
              {
                id: "readme",
                title: "README.md",
                path: "README.md",
                metadata: [],
                renderCacheKey: "readme",
                content: "# Alpha",
                isLoaded: true,
              },
            ],
            targets: [
              {
                id: "claude-code",
                label: "Claude Code",
                isEnabled: true,
              },
            ],
            skills: [
              {
                id: "skill-a",
                title: "Browse",
                isEnabled: true,
                documents: [
                  {
                    id: "skill-doc",
                    title: "SKILL.md",
                    path: "SKILL.md",
                    metadata: [],
                    renderCacheKey: "skill-doc",
                    content: "# Skill",
                    isLoaded: true,
                  },
                ],
              },
            ],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "partial",
            targetSelection: "full",
          },
        },
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new DetailViewModel(state, {
          updateSelection,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <DetailScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    const skillButton = renderer!.root.findByProps({ "data-skill-id": "skill-a" });
    await act(async () => {
      skillButton.props.onClick();
    });

    const targetToggle = renderer!.root.findByProps({ "data-target-toggle-id": "claude-code" });
    await act(async () => {
      await targetToggle.props.onClick();
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Browse");
    expect(text).toContain("SKILL.md");
    expect(text).toContain("# Skill");
    expect(updateSelection).toHaveBeenCalledWith("alpha", {
      enabledTargetIds: [],
      selectedSkillIds: ["skill-a"],
    });
  });
});

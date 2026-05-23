import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { formatDetailVersionText } from "../components/detail-header";
import { desktopRoute } from "../navigation/desktop-route";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DetailScreen } from "../screens/detail-screen";
import { DetailViewModel } from "../view-models/detail-view-model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("detail screen", () => {
  it("normalizes the version prefix for the detail header", () => {
    expect(formatDetailVersionText("1.0.0", "en")).toBe("Version v1.0.0");
    expect(formatDetailVersionText("v1.0.0", "en")).toBe("Version v1.0.0");
    expect(formatDetailVersionText(undefined, "en")).toBe(" ");
  });

  it("renders the detail sidebar with group row and skill rows", () => {
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

    expect(markup).toContain("data-view=\"detail-sidebar\"");
    expect(markup).toContain("data-view=\"detail-document-tabs\"");
    expect(markup).toContain("data-view=\"detail-fact-rail\"");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Skills");
    expect(markup).toContain("Alpha");
    expect(markup).toContain("README");
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("skill-a");
  });

  it("renders the group header metadata instead of a flat title block", () => {
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
            revision: "v1.2.3",
            fileTree: [],
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
            skills: [],
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

    expect(markup).toContain("data-view=\"detail-header\"");
    expect(markup).toContain("data-view=\"detail-meta-grid\"");
    expect(markup).toContain("Version v1.2.3");
    expect(markup).toContain("Targets");
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
    expect(text).toContain("detail-tree-panel");
    expect(updateSelection).toHaveBeenCalledWith("alpha", {
      enabledTargetIds: [],
      selectedSkillIds: ["skill-a"],
    });
  });

  it("renders nested file tree items and selects the owning skill from tree clicks", async () => {
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
            enabledTargetLabels: [],
            fileTree: [
              {
                id: "root",
                title: "alpha",
                path: "/alpha",
                isDirectory: true,
                isSkillRoot: false,
                isSkillDocument: false,
                children: [
                  {
                    id: "root/debug",
                    title: "debug",
                    path: "/alpha/debug",
                    isDirectory: true,
                    isSkillRoot: true,
                    isSkillDocument: false,
                    skillId: "debug",
                    children: [
                      {
                        id: "root/debug/SKILL.md",
                        title: "SKILL.md",
                        path: "/alpha/debug/SKILL.md",
                        isDirectory: false,
                        isSkillRoot: false,
                        isSkillDocument: true,
                        skillId: "debug",
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
            groupDocuments: [],
            targets: [],
            skills: [
              {
                id: "debug",
                title: "Debug",
                isEnabled: true,
                documents: [
                  {
                    id: "debug-md",
                    title: "DEBUG.md",
                    path: "DEBUG.md",
                    metadata: [],
                    renderCacheKey: "debug-md",
                    content: "# Debug",
                    isLoaded: true,
                  },
                ],
              },
            ],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "full",
            targetSelection: "empty",
          },
        },
      },
    });

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new DetailViewModel(state, {
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <DetailScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    expect(renderer!.root.findByProps({ "data-tree-item-id": "root/debug/SKILL.md" })).toBeTruthy();

    const treeButton = renderer!.root.findByProps({ "data-tree-item-id": "root/debug" });
    await act(async () => {
      treeButton.props.onClick();
    });

    expect(state.detailState.ui.showsGroupOverviewByGroup.alpha).toBe(false);
    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBe("debug");
    expect(JSON.stringify(renderer!.toJSON())).toContain("# Debug");
  });
});

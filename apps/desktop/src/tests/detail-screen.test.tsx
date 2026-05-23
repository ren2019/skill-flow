import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { formatDetailVersionText } from "../components/detail-header";
import { parseMarkdownBlocks } from "../components/markdown-document";
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

  it("parses common markdown blocks for the detail document renderer", () => {
    expect(parseMarkdownBlocks("# Title\n\nBody text.\n\n- One\n- Two\n\n```ts\nconst x = 1;\n```")).toEqual([
      { kind: "heading", level: 1, text: "Title" },
      { kind: "paragraph", text: "Body text." },
      { kind: "list", items: ["One", "Two"] },
      { kind: "code", text: "const x = 1;" },
    ]);
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
                id: "group:filetree",
                title: "File Tree",
                path: ".",
                metadata: [],
                renderCacheKey: "group:filetree",
                content: "",
                isLoaded: true,
              },
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
            targets: [{ id: "claude-code", label: "Claude Code", isEnabled: true }],
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
    expect(markup).toContain("data-view=\"desktop-route-title\"");
    expect(markup).toContain("data-action-icon=\"back\"");
    expect(markup).toContain("data-view=\"detail-document-tabs\"");
    expect(markup).toContain("data-view=\"detail-agent-rail\"");
    expect(markup).toContain("data-view=\"detail-group-documents\"");
    expect(markup).toContain("data-view=\"detail-file-tree-card\"");
    expect(markup).not.toContain("data-view=\"detail-fact-rail\"");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Skills");
    expect(markup).toContain("Alpha");
    expect(markup).toContain("README");
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("skill-a");
  });

  it("routes the detail top bar back button home", async () => {
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

    await act(async () => {
      renderer!.root.findByProps({ "data-action-icon": "back" }).props.onClick();
    });

    expect(state.view.currentRoute).toEqual({ kind: "home" });
  });

  it("renders and wires the detail tag rail", async () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      workspace: {
        sourceIds: ["alpha"],
        customTagsBySourceId: {
          alpha: [{ id: "custom:official", title: "Official" }],
        },
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: ["Codex"],
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
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "empty",
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

    expect(renderer!.root.findAllByProps({ "data-view": "detail-tag-rail" })).toHaveLength(1);
    await act(async () => {
      renderer!.root.findByProps({ "data-start-edit-group-tags-source-id": "alpha" }).props.onClick();
    });
    const input = renderer!.root.findByProps({ "data-group-tag-input-source-id": "alpha" });
    await act(async () => {
      input.props.onChange({ currentTarget: { value: "Review" } });
    });
    await act(async () => {
      renderer!.root.findByProps({ "data-add-group-tag-source-id": "alpha" }).props.onClick();
    });
    expect(state.workspace.customTagsBySourceId.alpha).toEqual([
      expect.objectContaining({ id: "custom:official" }),
      expect.objectContaining({ id: "custom:review", title: "Review" }),
    ]);

    await act(async () => {
      renderer!.root.findByProps({ "data-delete-group-tag-id": "alpha:custom:official" }).props.onClick();
    });
    expect(state.workspace.customTagsBySourceId.alpha).toEqual([
      expect.objectContaining({ id: "custom:review" }),
    ]);
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
            author: "obra",
            enabledTargetLabels: ["Claude Code", "Codex"],
            revision: "v1.2.3",
            downloadCount: 5045,
            starCount: 1200,
            repoUrl: "https://github.com/obra/alpha",
            groupPath: "/groups/alpha",
            totalSkillCount: 3,
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
    expect(markup).toContain("data-view=\"detail-header-stats\"");
    expect(markup).toContain("data-detail-header-stat=\"skills\"");
    expect(markup).toContain("data-detail-header-stat=\"download\"");
    expect(markup).toContain("data-detail-header-stat=\"star\"");
    expect(markup).toContain("data-detail-header-stat=\"github\"");
    expect(markup).toContain("data-detail-header-stat=\"local-file\"");
    expect(markup).toContain("data-detail-update-current=\"true\"");
    expect(markup).toContain("by obra");
    expect(markup).toContain("5,045");
    expect(markup).toContain("1,200");
    expect(markup).toContain("Alpha");
    expect(markup).not.toContain("Current route");
  });

  it("renders mac-style all toggles for detail agents and skills", () => {
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
            enabledTargetLabels: ["Codex"],
            fileTree: [],
            groupDocuments: [],
            targets: [
              { id: "codex", label: "Codex", isEnabled: true },
              { id: "cursor", label: "Cursor", isEnabled: false },
            ],
            skills: [
              { id: "skill-a", title: "Skill A", isEnabled: true, documents: [] },
              { id: "skill-b", title: "Skill B", isEnabled: false, documents: [] },
            ],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "partial",
            targetSelection: "partial",
          },
        },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("data-target-toggle-all=\"true\"");
    expect(markup).toContain("data-skill-toggle-all=\"true\"");
    expect(markup).toContain("MIX");
  });

  it("wires the group header update button to the detail view model", async () => {
    const updateGroup = vi.fn().mockResolvedValue(undefined);
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

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new DetailViewModel(state, {
          updateGroup,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <DetailScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      await renderer!.root.findByProps({ "data-detail-update-current": "true" }).props.onClick();
    });

    expect(updateGroup).toHaveBeenCalledWith("alpha");
  });

  it("wires the group header repository and local path actions", async () => {
    const openExternalUrl = vi.fn().mockResolvedValue(undefined);
    const openPath = vi.fn().mockResolvedValue(undefined);
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
            repoUrl: "https://github.com/obra/alpha",
            groupPath: "/groups/alpha",
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

    function Harness() {
      const [, setRevision] = useState(0);
      const viewModelRef = useRef(
        new DetailViewModel(state, {
          openExternalUrl,
          openPath,
          onChange: () => setRevision((value) => value + 1),
        }),
      );
      return <DetailScreen viewModel={viewModelRef.current} />;
    }

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Harness />);
    });

    await act(async () => {
      renderer!.root.findByProps({ "data-detail-header-action": "github" }).props.onClick();
      renderer!.root.findByProps({ "data-detail-header-action": "local-file" }).props.onClick();
    });

    expect(openExternalUrl).toHaveBeenCalledWith("https://github.com/obra/alpha");
    expect(openPath).toHaveBeenCalledWith("/groups/alpha");
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
                    metadata: [{ id: "name:browse", key: "name", value: "browse" }],
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

    const targetToggle = renderer!.root.findByProps({ "data-target-toggle-id": "claude-code" });
    await act(async () => {
      await targetToggle.props.onClick();
    });

    const skillButton = renderer!.root.findByProps({ "data-skill-id": "skill-a" });
    await act(async () => {
      skillButton.props.onClick();
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Browse");
    expect(text).toContain("SKILL.md");
    expect(text).toContain("Skill");
    expect(text).toContain("markdown-rendered-content");
    expect(text).toContain("markdown-metadata-table");
    expect(text).toContain("browse");
    expect(text).not.toContain("detail-tree-panel");
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

    const rootButton = renderer!.root.findByProps({ "data-tree-item-id": "root" });
    await act(async () => {
      rootButton.props.onClick();
    });
    expect(renderer!.root.findAllByProps({ "data-tree-item-id": "root/debug/SKILL.md" })).toHaveLength(0);

    await act(async () => {
      rootButton.props.onClick();
    });
    expect(renderer!.root.findByProps({ "data-tree-item-id": "root/debug/SKILL.md" })).toBeTruthy();

    const treeButton = renderer!.root.findByProps({ "data-tree-item-id": "root/debug" });
    await act(async () => {
      treeButton.props.onClick();
    });

    expect(state.detailState.ui.showsGroupOverviewByGroup.alpha).toBe(false);
    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBe("debug");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Debug");
  });
});

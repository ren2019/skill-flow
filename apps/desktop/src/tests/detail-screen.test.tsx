import ReactDOMServer from "react-dom/server";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { formatDetailVersionText } from "../components/detail-header";
import { MarkdownDocument, parseMarkdownBlocks } from "../components/markdown-document";
import { desktopRoute } from "../navigation/desktop-route";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DetailScreen } from "../screens/detail-screen";
import { DetailViewModel } from "../view-models/detail-view-model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("detail screen", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("parses richer GitHub-style markdown blocks for detail documents", () => {
    expect(parseMarkdownBlocks("#### Deep\n\n1. First\n2. Second\n\n> Quote\n> line\n\n---\n\n![Logo](assets/logo.png)")).toEqual([
      { kind: "heading", level: 4, text: "Deep" },
      { kind: "ordered-list", items: ["First", "Second"] },
      { kind: "blockquote", text: "Quote line" },
      { kind: "divider" },
      { kind: "image", alt: "Logo", url: "assets/logo.png" },
    ]);
  });

  it("parses markdown tables for detail documents", () => {
    expect(parseMarkdownBlocks("| Name | Value |\n| --- | ---: |\n| Agent | **Codex** |")).toEqual([
      {
        kind: "table",
        headers: ["Name", "Value"],
        rows: [["Agent", "**Codex**"]],
      },
    ]);
  });

  it("renders inline markdown links, emphasis, and code without raw markdown markers", () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <MarkdownDocument
        source={"Read **bold**, *italic*, `code`, and [docs](https://example.com).\n\n> Important\n\n1. Step\n\n| Name | Value |\n| --- | --- |\n| Agent | **Codex** |\n\n![Logo](assets/logo.png)"}
      />,
    );

    expect(markup).toContain("<strong>bold</strong>");
    expect(markup).toContain("<em>italic</em>");
    expect(markup).toContain("<code");
    expect(markup).toContain("href=\"https://example.com\"");
    expect(markup).toContain("<blockquote");
    expect(markup).toContain("<ol");
    expect(markup).toContain("data-view=\"markdown-table\"");
    expect(markup).toContain("<strong>Codex</strong>");
    expect(markup).toContain("<img");
    expect(markup).toContain("src=\"assets/logo.png\"");
    expect(markup).not.toContain("**bold**");
  });

  it("renders GitHub-style task lists and strikethrough text", () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <MarkdownDocument source={"- [x] Ship ~~old~~ new UI\n- [ ] Verify"} />,
    );

    expect(markup).toContain("data-view=\"markdown-task-item\"");
    expect(markup).toContain("checked=\"\"");
    expect(markup).toContain("<del>old</del>");
    expect(markup).toContain("Verify");
  });

  it("opens markdown document links through the desktop opener callback", async () => {
    const onOpenUrl = vi.fn().mockResolvedValue(undefined);
    const preventDefault = vi.fn();

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <MarkdownDocument
          source={"Read [docs](https://example.com)."}
          onOpenUrl={onOpenUrl}
        />,
      );
    });

    await act(async () => {
      renderer!.root.findByType("a").props.onClick({ preventDefault });
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onOpenUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("resolves relative markdown images and links from the document path", async () => {
    const onOpenPath = vi.fn().mockResolvedValue(undefined);
    const preventDefault = vi.fn();

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <MarkdownDocument
          path="/groups/alpha/docs/README.md"
          source={"![Logo](../assets/logo.png)\n\nRead [local doc](../guide.md)."}
          onOpenPath={onOpenPath}
        />,
      );
    });

    const image = renderer!.root.findByType("img");
    expect(image.props.src).toBe("file:///groups/alpha/assets/logo.png");

    await act(async () => {
      renderer!.root.findByType("a").props.onClick({ preventDefault });
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onOpenPath).toHaveBeenCalledWith("/groups/alpha/guide.md");
  });

  it("renders non-markdown detail documents as plain text and opens document external URLs", async () => {
    const openExternalUrl = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          selectedGroupDocumentIdByGroup: { alpha: "group:config" },
        },
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            fileTree: [],
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
                id: "group:config",
                title: "config.json",
                path: "/groups/alpha/config.json",
                metadata: [],
                renderCacheKey: "group:config",
                externalUrl: "https://example.com/config",
                content: "{\n  \"pattern\": \"**raw**\"\n}",
                isLoaded: true,
              },
            ],
            skillSelection: "empty",
            targetSelection: "empty",
            targets: [],
            skills: [],
            selectedSkillCount: 0,
            targetCount: 0,
            selectedTargetCount: 0,
            enabledTargetLabels: [],
          },
        },
      },
    });
    const viewModel = new DetailViewModel(state, { openExternalUrl });

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<DetailScreen viewModel={viewModel} />);
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("plain-document");
    expect(text).toContain("**raw**");
    expect(text).not.toContain("markdown-rendered-content");

    await act(async () => {
      renderer!.root.findByProps({ "data-document-external-url": "https://example.com/config" }).props.onClick();
    });

    expect(openExternalUrl.mock.calls).toEqual([["https://example.com/config"]]);
  });

  it("shows a loading placeholder while group document tab selection is pending", async () => {
    vi.useFakeTimers();
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          selectedGroupDocumentIdByGroup: { alpha: "readme" },
        },
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: [],
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
              {
                id: "guide",
                title: "GUIDE.md",
                path: "GUIDE.md",
                metadata: [],
                renderCacheKey: "guide",
                content: "# Guide",
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

    await act(async () => {
      renderer!.root.findByProps({ "data-group-document-id": "guide" }).props.onClick();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain("detail-document-loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(40);
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Guide");
    expect(text).toContain("markdown-rendered-content");
  });

  it("shows localized loading placeholders for selected unloaded documents", () => {
    const groupState = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      settings: {
        desktopLanguageRawValue: "zh-Hans",
      },
      detailState: {
        ui: {
          selectedGroupDocumentIdByGroup: { alpha: "guide" },
        },
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: [],
            fileTree: [],
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
                id: "guide",
                title: "GUIDE.md",
                path: "GUIDE.md",
                metadata: [],
                renderCacheKey: "guide",
                content: "",
                isLoaded: false,
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
    const skillState = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      settings: {
        desktopLanguageRawValue: "zh-Hans",
      },
      detailState: {
        ui: {
          showsGroupOverviewByGroup: { alpha: false },
          selectedSkillIdByGroup: { alpha: "debug" },
          selectedSkillDocumentIdBySkill: { debug: "debug-md" },
        },
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: [],
            fileTree: [],
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
                    content: "",
                    isLoaded: false,
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

    const groupMarkup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(groupState)} />,
    );
    const skillMarkup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(skillState)} />,
    );

    expect(groupMarkup).toContain("data-view=\"detail-document-loading\"");
    expect(groupMarkup).toContain("正在加载文档...");
    expect(groupMarkup).not.toContain("markdown-rendered-content");
    expect(skillMarkup).toContain("data-view=\"detail-document-loading\"");
    expect(skillMarkup).toContain("正在加载文档...");
    expect(skillMarkup).not.toContain("markdown-rendered-content");
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
            targets: [{ id: "claude-code", label: "Claude Code", shortLabel: "CC", isEnabled: true }],
            skills: [
              {
                id: "skill-a",
                title: "Browse",
                version: "2.0.0",
                documentContent: "one two three",
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
    expect(markup).toContain("data-view=\"detail-sidebar-skill-divider\"");
    expect(markup).toContain("data-view=\"detail-sidebar-selection-indicator\"");
    expect(markup).toContain("data-selected=\"true\"");
    expect(markup).toContain("Alpha");
    expect(markup).toContain("README");
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("data-target-id=\"claude-code\"");
    expect(markup).toContain("data-view=\"detail-info-row\"");
    expect(markup).toContain("data-detail-info-item=\"version\"");
    expect(markup).toContain("v2.0.0");
    expect(markup).toContain("data-detail-info-item=\"word-count\"");
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

  it("renders skill raw document content when the skill has no document tabs", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          showsGroupOverviewByGroup: { alpha: false },
          selectedSkillIdByGroup: { alpha: "skill-a" },
        },
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: [],
            fileTree: [],
            groupDocuments: [],
            targets: [],
            skills: [
              {
                id: "skill-a",
                title: "Standalone Skill",
                documentContent: "# Raw skill body\n\nUse this directly.",
                isEnabled: true,
                documents: [],
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

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("data-view=\"detail-skill-documents\"");
    expect(markup).not.toContain("data-view=\"detail-document-section-title\"");
    expect(markup).not.toContain("data-skill-document-id");
    expect(markup).toContain("plain-document");
    expect(markup).toContain("# Raw skill body");
    expect(markup).not.toContain("markdown-rendered-content");
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

  it("keeps the detail shell visible while inspect detail is loading", () => {
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
            activeTargetCount: 1,
            byline: "by obra",
            downloadCount: 1200,
            starCount: 34,
            skills: [{ id: "browse", title: "Browse", isEnabled: true }],
            targets: [{ id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true }],
            skillSelection: "partial",
            targetSelection: "full",
          },
        ],
      },
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("data-view=\"detail-layout\"");
    expect(markup).toContain("data-detail-loading=\"true\"");
    expect(markup).toContain("Alpha Starter");
    expect(markup).toContain("by obra");
    expect(markup).toContain("data-view=\"detail-sidebar\"");
    expect(markup).toContain("data-view=\"detail-header\"");
    expect(markup).toContain("data-view=\"detail-agent-rail\"");
    expect(markup).toContain("data-target-id=\"codex\"");
    expect(markup).toContain("data-view=\"detail-document-tab-loading\"");
    expect(markup).toContain("data-view=\"detail-document-loading\"");
    expect(markup).not.toContain("Loading source detail");
  });

  it("renders the mac-style empty state when skill view has no selected skill", () => {
    const state = createDesktopAppState({
      settings: {
        desktopLanguageRawValue: "zh-Hans",
      },
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          showsGroupOverviewByGroup: { alpha: false },
        },
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

    expect(markup).toContain("data-view=\"detail-empty-state\"");
    expect(markup).toContain("未选择技能");
    expect(markup).toContain("请从左侧列表中选择一个技能。");
    expect(markup).not.toContain("还没有加载详情内容");
  });

  it("wires overview, skill, tree, and document selections", async () => {
    vi.useFakeTimers();
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
                version: "1.0.0",
                documentContent: "# Skill",
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

    const pendingText = JSON.stringify(renderer!.toJSON());
    expect(pendingText).toContain("detail-document-loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(80);
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Browse");
    expect(text).toContain("SKILL.md");
    expect(text).toContain("Skill");
    expect(text).toContain("data-detail-info-item");
    expect(text).toContain("v1.0.0");
    expect(text).toContain("word-count");
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
    vi.useFakeTimers();
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
    expect(renderer!.root.findAllByProps({ "data-tree-row-depth": 0 })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-tree-row-depth": 1 })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-tree-row-depth": 2 })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-tree-guide-column": "true" }).length).toBeGreaterThan(0);
    expect(renderer!.root.findAllByProps({ "data-tree-node-lead": "true" }).length).toBeGreaterThan(0);
    expect(renderer!.root.findAllByProps({ "data-tree-node-icon": "folder" })).toHaveLength(2);
    expect(renderer!.root.findAllByProps({ "data-tree-node-icon": "document" })).toHaveLength(1);

    const rootButton = renderer!.root.findByProps({ "data-tree-item-id": "root" });
    await act(async () => {
      rootButton.props.onClick();
    });
    expect(renderer!.root.findAllByProps({ "data-tree-item-id": "root/debug/SKILL.md" })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ "data-tree-selected": "true" })).toHaveLength(1);

    await act(async () => {
      rootButton.props.onClick();
    });
    expect(renderer!.root.findByProps({ "data-tree-item-id": "root/debug/SKILL.md" })).toBeTruthy();

    const treeButton = renderer!.root.findByProps({ "data-tree-item-id": "root/debug" });
    await act(async () => {
      treeButton.props.onClick();
    });

    expect(state.detailState.ui.showsGroupOverviewByGroup.alpha).toBe(false);
    expect(state.detailState.ui.pendingSkillIdByGroup.alpha).toBe("debug");
    expect(JSON.stringify(renderer!.toJSON())).toContain("detail-document-loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(80);
    });

    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBe("debug");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Debug");
  });
});

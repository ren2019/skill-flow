import { describe, expect, it, vi } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { desktopRoute } from "../navigation/desktop-route";
import { DetailViewModel } from "../view-models/detail-view-model";

describe("detail view model", () => {
  it("reads and updates the selected source through shared state", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });

    const viewModel = new DetailViewModel(state);

    expect(viewModel.sourceId).toBe("alpha");
    expect(viewModel.currentRoute).toEqual(desktopRoute.detail("alpha"));

    viewModel.showSource("beta");

    expect(state.view.currentRoute).toEqual(desktopRoute.detail("beta"));
    expect(state.view.selectedSourceId).toBe("beta");
    expect(viewModel.sourceId).toBe("beta");
  });

  it("ignores blank detail source ids", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });

    const viewModel = new DetailViewModel(state);

    viewModel.showSource("   ");

    expect(state.view.currentRoute).toEqual(desktopRoute.detail("alpha"));
    expect(state.view.selectedSourceId).toBe("alpha");
  });

  it("keeps detail content route-scoped and merges enrichment into inspect data", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        detailsBySourceId: {
          beta: {
            sourceId: "beta",
            title: "Beta",
            enabledTargetLabels: ["Codex"],
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
    const viewModel = new DetailViewModel(state);

    expect(viewModel.detail).toBeUndefined();

    viewModel.hydrateInspect("alpha", {
      sourceId: "alpha",
      title: "Alpha",
      enabledTargetLabels: ["Claude Code"],
      fileTree: [],
      groupDocuments: [],
      targets: [],
      skills: [],
      sourceFacts: [],
      deploymentFacts: [],
      skillSelection: "empty",
      targetSelection: "empty",
    });
    viewModel.hydrateEnrichment("alpha", {
      sourceFacts: ["Updated yesterday"],
      deploymentFacts: ["Claude Code -> ~/.claude"],
    });

    expect(viewModel.detail).toEqual(
      expect.objectContaining({
        sourceId: "alpha",
        title: "Alpha",
        sourceFacts: ["Updated yesterday"],
        deploymentFacts: ["Claude Code -> ~/.claude"],
      }),
    );
    expect(state.detailState.detailsBySourceId.beta.title).toBe("Beta");
  });

  it("defaults selection state to group overview and first document tab", () => {
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
            targets: [],
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
    const viewModel = new DetailViewModel(state);

    expect(viewModel.showingGroupOverview).toBe(true);
    expect(viewModel.selectedGroupDocument?.id).toBe("readme");

    viewModel.selectSkill("skill-a");

    expect(viewModel.showingGroupOverview).toBe(false);
    expect(viewModel.selectedSkillId).toBe("skill-a");
    expect(viewModel.selectedTreeItemId).toBe("root/skill-a");
    expect(viewModel.selectedSkillDocument?.id).toBe("skill-doc");
  });

  it("seeds shared detail selection state when inspect data hydrates for the first time", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });
    const viewModel = new DetailViewModel(state);

    viewModel.hydrateInspect("alpha", {
      sourceId: "alpha",
      title: "Alpha",
      enabledTargetLabels: [],
      fileTree: [
        {
          id: "root/browse",
          title: "browse",
          path: "/alpha/browse",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "browse",
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
          id: "browse",
          title: "Browse",
          isEnabled: true,
          documents: [
            {
              id: "skill-md",
              title: "SKILL.md",
              path: "SKILL.md",
              metadata: [],
              renderCacheKey: "skill-md",
              content: "# Skill",
              isLoaded: true,
            },
          ],
        },
      ],
      sourceFacts: [],
      deploymentFacts: [],
      skillSelection: "full",
      targetSelection: "empty",
    });

    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBe("browse");
    expect(state.detailState.ui.selectedGroupDocumentIdByGroup.alpha).toBe("readme");
    expect(state.detailState.ui.selectedSkillDocumentIdBySkill.browse).toBe("skill-md");
    expect(state.detailState.ui.showsGroupOverviewByGroup.alpha).toBe(true);
  });

  it("preserves an existing shared detail sub-selection when inspect data rehydrates", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          selectedSkillIdByGroup: { alpha: "debug" },
          showsGroupOverviewByGroup: { alpha: false },
          selectedTreeItemIdByGroup: { alpha: "root/debug" },
          selectedGroupDocumentIdByGroup: { alpha: "changelog" },
          selectedSkillDocumentIdBySkill: { debug: "debug-md" },
        },
      },
    });
    const viewModel = new DetailViewModel(state);

    viewModel.hydrateInspect("alpha", {
      sourceId: "alpha",
      title: "Alpha",
      enabledTargetLabels: [],
      fileTree: [
        {
          id: "root/browse",
          title: "browse",
          path: "/alpha/browse",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "browse",
          children: [],
        },
        {
          id: "root/debug",
          title: "debug",
          path: "/alpha/debug",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "debug",
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
        {
          id: "changelog",
          title: "CHANGELOG.md",
          path: "CHANGELOG.md",
          metadata: [],
          renderCacheKey: "changelog",
          content: "# Changelog",
          isLoaded: true,
        },
      ],
      targets: [],
      skills: [
        {
          id: "browse",
          title: "Browse",
          isEnabled: true,
          documents: [],
        },
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
    });

    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBe("debug");
    expect(state.detailState.ui.selectedGroupDocumentIdByGroup.alpha).toBe("changelog");
    expect(state.detailState.ui.selectedSkillDocumentIdBySkill.debug).toBe("debug-md");
    expect(state.detailState.ui.showsGroupOverviewByGroup.alpha).toBe(false);
    expect(viewModel.selectedSkillId).toBe("debug");
    expect(viewModel.selectedSkillDocument?.id).toBe("debug-md");
  });

  it("realigns stale shared detail selections to the first valid entries on rehydrate", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          selectedSkillIdByGroup: { alpha: "missing-skill" },
          showsGroupOverviewByGroup: { alpha: false },
          selectedTreeItemIdByGroup: { alpha: "root/missing-skill" },
          selectedGroupDocumentIdByGroup: { alpha: "missing-doc" },
          selectedSkillDocumentIdBySkill: { "missing-skill": "missing-skill-doc" },
        },
      },
    });
    const viewModel = new DetailViewModel(state);

    viewModel.hydrateInspect("alpha", {
      sourceId: "alpha",
      title: "Alpha",
      enabledTargetLabels: [],
      fileTree: [
        {
          id: "root/browse",
          title: "browse",
          path: "/alpha/browse",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "browse",
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
          id: "browse",
          title: "Browse",
          isEnabled: true,
          documents: [
            {
              id: "skill-md",
              title: "SKILL.md",
              path: "SKILL.md",
              metadata: [],
              renderCacheKey: "skill-md",
              content: "# Skill",
              isLoaded: true,
            },
          ],
        },
      ],
      sourceFacts: [],
      deploymentFacts: [],
      skillSelection: "full",
      targetSelection: "empty",
    });

    expect(state.detailState.ui.selectedSkillIdByGroup.alpha).toBe("browse");
    expect(state.detailState.ui.selectedGroupDocumentIdByGroup.alpha).toBe("readme");
    expect(state.detailState.ui.selectedSkillDocumentIdBySkill.browse).toBe("skill-md");
    expect(state.detailState.ui.selectedTreeItemIdByGroup.alpha).toBeUndefined();
    expect(viewModel.selectedSkillId).toBe("browse");
    expect(viewModel.selectedSkillDocument?.id).toBe("skill-md");
    expect(viewModel.selectedTreeItemId).toBe("root/browse");
  });

  it("keeps the same default overview, file tree, group document, and skill document selection rules as macOS", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
    });
    const viewModel = new DetailViewModel(state);

    viewModel.hydrateInspect("alpha", {
      sourceId: "alpha",
      title: "Alpha",
      enabledTargetLabels: [],
      fileTree: [
        {
          id: "root/browse",
          title: "browse",
          path: "/alpha/browse",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "browse",
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
          id: "browse",
          title: "Browse",
          isEnabled: true,
          documents: [
            {
              id: "skill-md",
              title: "SKILL.md",
              path: "SKILL.md",
              metadata: [],
              renderCacheKey: "skill-md",
              content: "# Skill",
              isLoaded: true,
            },
          ],
        },
      ],
      sourceFacts: [],
      deploymentFacts: [],
      skillSelection: "full",
      targetSelection: "empty",
    });

    expect(viewModel.showingGroupOverview).toBe(true);
    expect(viewModel.selectedGroupDocument?.id).toBe("readme");

    viewModel.selectSkill("browse");

    expect(viewModel.showingGroupOverview).toBe(false);
    expect(viewModel.selectedTreeItemId).toBe("root/browse");
    expect(viewModel.selectedSkillDocument?.id).toBe("skill-md");
  });

  it("keeps valid sub-selections on rehydrate and realigns only invalid ones", () => {
    const preservedState = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        ui: {
          selectedSkillIdByGroup: { alpha: "debug" },
          showsGroupOverviewByGroup: { alpha: false },
          selectedTreeItemIdByGroup: { alpha: "root/debug" },
          selectedGroupDocumentIdByGroup: { alpha: "changelog" },
          selectedSkillDocumentIdBySkill: { debug: "debug-md" },
        },
      },
    });
    const preservedViewModel = new DetailViewModel(preservedState);

    preservedViewModel.hydrateInspect("alpha", {
      sourceId: "alpha",
      title: "Alpha",
      enabledTargetLabels: [],
      fileTree: [
        {
          id: "root/debug",
          title: "debug",
          path: "/alpha/debug",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "debug",
          children: [],
        },
      ],
      groupDocuments: [
        {
          id: "changelog",
          title: "CHANGELOG.md",
          path: "CHANGELOG.md",
          metadata: [],
          renderCacheKey: "changelog",
          content: "# Changelog",
          isLoaded: true,
        },
      ],
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
    });

    expect(preservedViewModel.selectedSkillId).toBe("debug");
    expect(preservedViewModel.selectedTreeItemId).toBe("root/debug");
    expect(preservedViewModel.selectedSkillDocument?.id).toBe("debug-md");

    const realignedState = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("beta"),
        selectedSourceId: "beta",
      },
      detailState: {
        ui: {
          selectedSkillIdByGroup: { beta: "missing-skill" },
          showsGroupOverviewByGroup: { beta: false },
          selectedTreeItemIdByGroup: { beta: "root/missing-skill" },
          selectedGroupDocumentIdByGroup: { beta: "missing-doc" },
          selectedSkillDocumentIdBySkill: { "missing-skill": "missing-skill-doc" },
        },
      },
    });
    const realignedViewModel = new DetailViewModel(realignedState);

    realignedViewModel.hydrateInspect("beta", {
      sourceId: "beta",
      title: "Beta",
      enabledTargetLabels: [],
      fileTree: [
        {
          id: "root/browse",
          title: "browse",
          path: "/beta/browse",
          isDirectory: true,
          isSkillRoot: true,
          isSkillDocument: false,
          skillId: "browse",
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
          content: "# Beta",
          isLoaded: true,
        },
      ],
      targets: [],
      skills: [
        {
          id: "browse",
          title: "Browse",
          isEnabled: true,
          documents: [
            {
              id: "skill-md",
              title: "SKILL.md",
              path: "SKILL.md",
              metadata: [],
              renderCacheKey: "skill-md",
              content: "# Skill",
              isLoaded: true,
            },
          ],
        },
      ],
      sourceFacts: [],
      deploymentFacts: [],
      skillSelection: "full",
      targetSelection: "empty",
    });

    expect(realignedViewModel.selectedSkillId).toBe("browse");
    expect(realignedViewModel.selectedTreeItemId).toBe("root/browse");
    expect(realignedViewModel.selectedSkillDocument?.id).toBe("skill-md");
  });

  it("rolls back target selection and records a toast when persistence fails", async () => {
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
            targets: [{ id: "codex", label: "Codex", isEnabled: true }],
            skills: [{ id: "skill-a", title: "Skill A", isEnabled: true, documents: [] }],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "full",
            targetSelection: "full",
          },
        },
      },
    });
    const viewModel = new DetailViewModel(state, {
      updateSelection: vi.fn().mockRejectedValue(new Error("save failed")),
    });

    await viewModel.toggleTarget("codex");

    expect(state.detailState.detailsBySourceId.alpha.targets).toEqual([
      { id: "codex", label: "Codex", isEnabled: true },
    ]);
    expect(state.detailState.detailsBySourceId.alpha.enabledTargetLabels).toEqual(["Codex"]);
    expect(state.view.toastMessage).toBe("save failed");
  });

  it("rolls back skill selection and records a toast when persistence fails", async () => {
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
            skills: [{ id: "skill-a", title: "Skill A", isEnabled: true, documents: [] }],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "full",
            targetSelection: "empty",
          },
        },
      },
    });
    const viewModel = new DetailViewModel(state, {
      updateSelection: vi.fn().mockRejectedValue(new Error("save failed")),
    });

    await viewModel.toggleSkill("skill-a");

    expect(state.detailState.detailsBySourceId.alpha.skills).toEqual([
      { id: "skill-a", title: "Skill A", isEnabled: true, documents: [] },
    ]);
    expect(state.view.toastMessage).toBe("save failed");
  });

  it("rolls back target and skill toggles when persistence fails", async () => {
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
            targets: [{ id: "codex", label: "Codex", isEnabled: true }],
            skills: [{ id: "skill-a", title: "Skill A", isEnabled: true, documents: [] }],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "full",
            targetSelection: "full",
          },
        },
      },
    });
    const viewModel = new DetailViewModel(state, {
      updateSelection: vi.fn().mockRejectedValue(new Error("save failed")),
    });

    await viewModel.toggleTarget("codex");
    await viewModel.toggleSkill("skill-a");

    expect(state.detailState.detailsBySourceId.alpha.targets).toEqual([
      { id: "codex", label: "Codex", isEnabled: true },
    ]);
    expect(state.detailState.detailsBySourceId.alpha.skills).toEqual([
      { id: "skill-a", title: "Skill A", isEnabled: true, documents: [] },
    ]);
    expect(state.view.toastMessage).toBe("save failed");
  });
});

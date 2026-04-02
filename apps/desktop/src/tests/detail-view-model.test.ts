import { describe, expect, it } from "vitest";
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
});

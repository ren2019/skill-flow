import { describe, expect, it, vi } from "vitest";
import { createDesktopIntegration } from "../runtime/desktop-integration";
import { createDesktopAppState } from "../store/desktop-app-state";

describe("desktop integration runtime", () => {
  it("hydrates inventory summaries from the bridge list response", async () => {
    const state = createDesktopAppState();
    const integration = createDesktopIntegration(state, {
      bridgeClient: {
        invoke: vi.fn().mockResolvedValue({
          protocolVersion: "1.0",
          command: "list",
          ok: true,
          warnings: [],
          errors: [],
          data: {
            summaries: [
              {
                source: {
                  id: "alpha",
                  displayName: "Alpha Starter",
                  locator: "obra/alpha",
                  kind: "git",
                },
                leafs: [
                  { id: "alpha:browse", name: "Browse", linkName: "browse" },
                  { id: "alpha:review", name: "Review", linkName: "review" },
                  { id: "alpha:ship", name: "Ship", linkName: "ship" },
                ],
                bindings: {
                  selectedLeafIds: ["alpha:browse", "alpha:review"],
                  targets: {
                    codex: { enabled: true, leafIds: ["alpha:browse"] },
                    "claude-code": { enabled: true, leafIds: ["alpha:review"] },
                  },
                },
                activeTargetCount: 2,
                health: "HEALTHY",
                issueCounts: { warning: 1, error: 0 },
              },
            ],
            groupCardEnrichmentBySourceId: {
              alpha: {
                sourceMetadata: {
                  status: "ready",
                  provider: "github",
                  data: {
                    ownerHandle: "obra",
                    starCount: 1200,
                  },
                },
                sourceSnapshot: {
                  canonicalRepo: "obra/alpha",
                  aliases: [],
                  title: "Alpha Starter",
                  provider: "skills",
                  sourceUrl: "https://skills.github.com/obra/alpha",
                  repoUrl: "https://github.com/obra/alpha",
                  repoLabel: "obra/alpha",
                  totalInstalls: 5045,
                  repoStars: 1200,
                  owner: {
                    slug: "obra",
                    sourceUrl: "https://skills.github.com/obra",
                  },
                  skills: [],
                },
                groupPath: "/groups/alpha",
              },
            },
          },
        }),
      },
    });

    await integration.refreshInventory();

    expect(state.workspace.inventorySummaries).toEqual([
      expect.objectContaining({
        sourceId: "alpha",
        title: "Alpha Starter",
        locator: "obra/alpha",
        byline: "by obra",
        skillCount: 3,
        enabledSkillCount: 2,
        activeTargetCount: 2,
        downloadCount: 5045,
        starCount: 1200,
        repoUrl: "https://github.com/obra/alpha",
        groupPath: "/groups/alpha",
        enabledTargetLabels: ["Codex", "Claude Code"],
        selectedSkillNames: ["browse", "review"],
      }),
    ]);
  });

  it("hydrates pins and project scope state from the bridge list response", async () => {
    const state = createDesktopAppState();
    const integration = createDesktopIntegration(state, {
      bridgeClient: {
        invoke: vi.fn().mockResolvedValue({
          protocolVersion: "1.0",
          command: "list",
          ok: true,
          warnings: [],
          errors: [],
          data: {
            summaries: [
              {
                source: {
                  id: "alpha",
                  displayName: "Alpha Starter",
                  locator: "obra/alpha",
                },
              },
              {
                source: {
                  id: "beta",
                  displayName: "Beta Tools",
                  locator: "obra/beta",
                },
              },
            ],
            pinnedSourceIds: ["beta", "", 42],
            recentProjects: [
              {
                projectId: "repo-a",
                title: "Repo A",
                lastActivityAt: "2026-04-02T10:00:00Z",
                projectPath: "/tmp/repo-a",
                tools: ["codex", "cursor", 42],
              },
              {
                projectId: "repo-b",
                title: "Repo B",
                lastActivityAt: "2026-04-01T08:00:00Z",
              },
            ],
            selectedProjectScope: {
              kind: "project",
              projectId: "repo-a",
            },
          },
        }),
      },
    });

    await integration.refreshInventory();

    expect(state.workspace.sourceIds).toEqual(["alpha", "beta"]);
    expect(state.workspace.pinnedSourceIds).toEqual(["beta"]);
    expect(state.settings.recentProjectScopes).toEqual([
      {
        projectId: "repo-a",
        title: "Repo A",
        lastActivityAt: "2026-04-02T10:00:00Z",
        projectPath: "/tmp/repo-a",
        tools: ["codex", "cursor"],
      },
      {
        projectId: "repo-b",
        title: "Repo B",
        lastActivityAt: "2026-04-01T08:00:00Z",
        tools: [],
      },
    ]);
    expect(state.settings.selectedProjectScope).toEqual({
      kind: "project",
      projectId: "repo-a",
    });
  });

  it("hydrates detail state from the bridge inspect and enrichment responses", async () => {
    const state = createDesktopAppState({
      settings: {
        selectedProjectScope: { kind: "project", projectId: "repo-a" },
      },
    });
    const invoke = vi.fn()
      .mockResolvedValueOnce({
        protocolVersion: "1.0",
        command: "inspect",
        ok: true,
        warnings: [],
        errors: [],
        data: {
          summary: {
            source: {
              id: "alpha",
              displayName: "Alpha Starter",
              locator: "obra/alpha",
            },
            lock: {
              checkoutPath: "/groups/alpha",
              updatedAt: "2026-04-03T10:00:00Z",
              resolvedVersion: "1.2.3",
            },
            bindings: {
              selectedLeafIds: ["alpha:browse"],
              targets: {
                codex: { enabled: true, leafIds: ["alpha:browse"] },
              },
            },
            activeTargetCount: 1,
            health: "HEALTHY",
            issueCounts: { warning: 0, error: 0 },
          },
          source: {
            id: "alpha",
            displayName: "Alpha Starter",
            locator: "obra/alpha",
            kind: "git",
          },
          binding: {
            selectedLeafIds: ["alpha:browse"],
            targets: {
              codex: { enabled: true, leafIds: ["alpha:browse"] },
            },
          },
          leafs: [
            {
              id: "alpha:browse",
              name: "Browse",
              linkName: "browse",
              title: "Browse",
              relativePath: "skills/browse",
              skillFilePath: "skills/browse/SKILL.md",
              description: "Browse code quickly.",
            },
          ],
          deployments: [
            {
              target: "codex",
              targetPath: "~/.codex/skills/alpha",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        protocolVersion: "1.0",
        command: "inspect-enrichment",
        ok: true,
        warnings: [],
        errors: [],
        data: {
          sourceMetadata: {
            status: "ready",
            provider: "github",
            data: {
              ownerHandle: "obra",
              starCount: 1200,
              description: "Alpha detail package",
            },
          },
          sourceSnapshot: {
            repoLabel: "obra/alpha",
            repoStars: 1200,
            summary: "GitHub mirror",
          },
        },
      });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    await integration.loadDetail?.("alpha");

    expect(invoke).toHaveBeenNthCalledWith(1, "inspect", {
      sourceId: "alpha",
      scope: { kind: "project", projectId: "repo-a" },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "inspect-enrichment", {
      sourceId: "alpha",
    });
    expect(state.detailState.detailsBySourceId.alpha).toEqual(
      expect.objectContaining({
        sourceId: "alpha",
        title: "Alpha Starter",
        revision: "1.2.3",
        locator: "obra/alpha",
        groupPath: "/groups/alpha",
        enabledTargetLabels: ["Codex"],
        health: "HEALTHY",
        skillSelection: "full",
        targetSelection: "full",
        sourceFacts: expect.arrayContaining(["obra/alpha", "/groups/alpha", "obra/alpha"]),
        deploymentFacts: ["Codex -> ~/.codex/skills/alpha"],
        targets: [
          expect.objectContaining({
            id: "codex",
            isEnabled: true,
          }),
        ],
        skills: [
          expect.objectContaining({
            id: "alpha:browse",
            isEnabled: true,
          }),
        ],
      }),
    );
  });
});

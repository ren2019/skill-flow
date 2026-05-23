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
        skillSelection: "partial",
        targetSelection: "full",
        skills: [
          { id: "alpha:browse", title: "browse", isEnabled: true },
          { id: "alpha:review", title: "review", isEnabled: true },
          { id: "alpha:ship", title: "ship", isEnabled: false },
        ],
        targets: [
          { id: "codex", label: "Codex", shortLabel: "CX", isEnabled: true },
          { id: "claude-code", label: "Claude Code", shortLabel: "CC", isEnabled: true },
        ],
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
              documentContent: "# Browse\n\nBridge-loaded skill body.",
              documents: [
                {
                  id: "/groups/alpha/skills/browse/SKILL.md",
                  title: "SKILL.md",
                  path: "/groups/alpha/skills/browse/SKILL.md",
                  metadata: [{ id: "name:browse", key: "name", value: "browse" }],
                  renderCacheKey: "document:/groups/alpha/skills/browse/SKILL.md",
                  content: "# Browse\n\nBridge-loaded skill body.",
                  isLoaded: true,
                },
              ],
            },
          ],
          deployments: [
            {
              target: "codex",
              targetPath: "~/.codex/skills/alpha",
            },
          ],
          fileTree: [
            {
              id: "root/skills",
              title: "skills",
              path: "/groups/alpha/skills",
              isDirectory: true,
              isSkillRoot: false,
              isSkillDocument: false,
              children: [
                {
                  id: "root/skills/browse",
                  title: "browse",
                  path: "/groups/alpha/skills/browse",
                  isDirectory: true,
                  isSkillRoot: true,
                  isSkillDocument: false,
                  skillId: "alpha:browse",
                  children: [],
                },
              ],
            },
          ],
          groupDocuments: [
            {
              id: "group:filetree",
              title: "File Tree",
              path: "/groups/alpha",
              metadata: [],
              renderCacheKey: "document:/groups/alpha",
              content: "",
              isLoaded: true,
            },
            {
              id: "group:/groups/alpha/README.md",
              title: "README.md",
              path: "/groups/alpha/README.md",
              metadata: [],
              renderCacheKey: "document:/groups/alpha/README.md",
              content: "# Alpha",
              isLoaded: true,
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
            repoUrl: "https://github.com/obra/alpha",
            totalInstalls: 5045,
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
        downloadCount: 5045,
        starCount: 1200,
        repoUrl: "https://github.com/obra/alpha",
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
            documents: [
              expect.objectContaining({
                title: "SKILL.md",
                content: "# Browse\n\nBridge-loaded skill body.",
              }),
            ],
          }),
        ],
        fileTree: [
          expect.objectContaining({
            id: "root/skills",
          }),
        ],
        groupDocuments: [
          expect.objectContaining({
            id: "group:filetree",
            title: "File Tree",
            isLoaded: true,
          }),
          expect.objectContaining({
            id: "group:/groups/alpha/README.md",
            title: "README.md",
            content: "# Alpha",
            isLoaded: true,
          }),
        ],
      }),
    );
    expect(state.detailState.ui.selectedGroupDocumentIdByGroup.alpha).toBe("group:filetree");
  });

  it("cleans dirty detail titles using snapshot and locator fallbacks", async () => {
    const state = createDesktopAppState();
    const dirtyTitle = "zsh-compatible: use find in missing directory";
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
              displayName: dirtyTitle,
              locator: "https://github.com/anthropics/skills",
            },
          },
          source: {
            id: "alpha",
            displayName: dirtyTitle,
            locator: "https://github.com/anthropics/skills",
            kind: "git",
          },
          binding: {
            selectedLeafIds: ["alpha:browse"],
            targets: {},
          },
          leafs: [
            {
              id: "alpha:browse",
              name: dirtyTitle,
              linkName: "browse",
              version: "1.0.0",
              documentContent: "one two three",
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
          sourceSnapshot: {
            title: "Anthropic Skills",
            skills: [{ skillId: "browse", title: "Browse Web" }],
          },
        },
      })
      .mockResolvedValueOnce({
        protocolVersion: "1.0",
        command: "inspect",
        ok: true,
        warnings: [],
        errors: [],
        data: {
          summary: {
            source: {
              id: "beta",
              displayName: dirtyTitle,
              locator: "https://github.com/anthropics/skills",
            },
          },
          source: {
            id: "beta",
            displayName: dirtyTitle,
            locator: "https://github.com/anthropics/skills",
            kind: "git",
          },
          binding: {
            selectedLeafIds: ["beta:debug"],
            targets: {},
          },
          leafs: [
            {
              id: "beta:debug",
              name: dirtyTitle,
              linkName: "debug",
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
        data: {},
      });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    await integration.loadDetail?.("alpha");
    await integration.loadDetail?.("beta");

    expect(state.detailState.detailsBySourceId.alpha?.title).toBe("Anthropic Skills");
    expect(state.detailState.detailsBySourceId.alpha?.skills[0]?.title).toBe("Browse Web");
    expect(state.detailState.detailsBySourceId.alpha?.skills[0]?.version).toBe("1.0.0");
    expect(state.detailState.detailsBySourceId.alpha?.skills[0]?.documentContent).toBe("one two three");
    expect(state.detailState.detailsBySourceId.beta?.title).toBe("skills");
    expect(state.detailState.detailsBySourceId.beta?.skills[0]?.title).toBe("debug");
  });

  it("sends update requests for a single source through the bridge", async () => {
    const state = createDesktopAppState();
    const invoke = vi.fn().mockResolvedValue({
      protocolVersion: "1.0",
      command: "update",
      ok: true,
      warnings: [],
      errors: [],
      data: { updated: 1 },
    });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    const result = await integration.updateSource?.(" alpha ");

    expect(invoke).toHaveBeenCalledWith("update", {
      sourceIds: ["alpha"],
    });
    expect(result).toEqual({ updated: 1 });
  });

  it("sends batched update requests through the bridge", async () => {
    const state = createDesktopAppState();
    const invoke = vi.fn().mockResolvedValue({
      protocolVersion: "1.0",
      command: "update",
      ok: true,
      warnings: [],
      errors: [],
      data: {
        updated: [{ sourceId: "alpha", changed: true }],
      },
    });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    const result = await integration.updateSources?.([" alpha ", "", "beta"]);

    expect(invoke).toHaveBeenCalledWith("update", {
      sourceIds: ["alpha", "beta"],
    });
    expect(result).toEqual({
      updated: [{ sourceId: "alpha", changed: true }],
    });
  });

  it("persists detail skill and target selection through the bridge apply command", async () => {
    const state = createDesktopAppState({
      settings: {
        selectedProjectScope: { kind: "project", projectId: "repo-a" },
      },
    });
    const invoke = vi.fn().mockResolvedValue({
      protocolVersion: "1.0",
      command: "apply",
      ok: true,
      warnings: [],
      errors: [],
      data: { applied: true },
    });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    await integration.updateSelection?.(" alpha ", {
      selectedSkillIds: ["alpha:browse"],
      enabledTargetIds: ["codex"],
    });

    expect(invoke).toHaveBeenCalledWith("apply", {
      sourceId: "alpha",
      scope: { kind: "project", projectId: "repo-a" },
      draft: {
        selectedLeafIds: ["alpha:browse"],
        enabledTargets: ["codex"],
      },
    });
  });

  it("maps import search, preview, and import bridge responses", async () => {
    const state = createDesktopAppState();
    const invoke = vi.fn()
      .mockResolvedValueOnce({
        protocolVersion: "1.0",
        command: "search-import-groups",
        ok: true,
        warnings: [],
        errors: [],
        data: {
          groups: [
            {
              id: "starter",
              title: "Starter",
              locator: "obra/starter",
              canonicalRepo: "obra/starter",
              installed: true,
              repoUrl: "https://github.com/obra/starter",
              starCount: 42,
              totalInstalls: 1200,
              skillCount: 3,
              snapshot: {
                skills: [
                  { skillId: "browse", title: "Browse" },
                ],
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        protocolVersion: "1.0",
        command: "preview-import-source",
        ok: true,
        warnings: [],
        errors: [],
        data: {
          status: "ready",
          selectedSkillIds: ["browse"],
          enabledTargets: ["codex"],
          skills: [{ id: "browse", title: "Browse" }],
          targets: [{ id: "codex" }, { id: "cursor" }],
        },
      })
      .mockResolvedValueOnce({
        protocolVersion: "1.0",
        command: "import-source",
        ok: true,
        warnings: [],
        errors: [],
        data: {
          status: "ready",
          sourceId: "starter",
        },
      });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    await expect(integration.searchImportGroups?.("starter")).resolves.toEqual([
      expect.objectContaining({
        id: "starter",
        title: "Starter",
        locator: "obra/starter",
        canonicalRepo: "obra/starter",
        isInstalledLocally: true,
        previewPhase: { kind: "ready" },
        skillCount: 3,
        downloadCount: 1200,
        starCount: 42,
        repoUrl: "https://github.com/obra/starter",
        skills: [{ id: "browse", title: "Browse", selectedByDefault: true }],
        targets: [],
      }),
    ]);
    await expect(integration.previewImportSource?.(" obra/starter ")).resolves.toEqual({
      skills: [{ id: "browse", title: "Browse", selectedByDefault: true }],
      targets: [
        { id: "codex", selectedByDefault: true },
        { id: "cursor", selectedByDefault: false },
      ],
    });
    await expect(integration.importSource?.(" obra/starter ", {
      selectedSkillIds: ["browse"],
      enabledTargets: ["codex"],
    })).resolves.toEqual({ sourceId: "starter" });

    expect(invoke).toHaveBeenNthCalledWith(1, "search-import-groups", { query: "starter" });
    expect(invoke).toHaveBeenNthCalledWith(2, "preview-import-source", { locator: "obra/starter" });
    expect(invoke).toHaveBeenNthCalledWith(3, "import-source", {
      locator: "obra/starter",
      draft: {
        selectedSkillIds: ["browse"],
        enabledTargets: ["codex"],
      },
    });
  });

  it("persists pinned source changes through the bridge", async () => {
    const state = createDesktopAppState();
    const invoke = vi.fn().mockResolvedValue({
      protocolVersion: "1.0",
      command: "toggle-pin",
      ok: true,
      warnings: [],
      errors: [],
      data: {
        pinnedSourceIds: ["beta", "alpha", "", 42],
      },
    });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    const pinnedSourceIds = await integration.togglePinnedSource?.(" alpha ");

    expect(invoke).toHaveBeenCalledWith("toggle-pin", {
      sourceId: "alpha",
    });
    expect(pinnedSourceIds).toEqual(["beta", "alpha"]);
  });

  it("sends uninstall requests for a single source through the bridge", async () => {
    const state = createDesktopAppState();
    const invoke = vi.fn().mockResolvedValue({
      protocolVersion: "1.0",
      command: "uninstall",
      ok: true,
      warnings: [],
      errors: [],
      data: {
        removed: ["alpha"],
      },
    });
    const integration = createDesktopIntegration(state, {
      bridgeClient: { invoke },
    });

    await integration.deleteSource?.(" alpha ");

    expect(invoke).toHaveBeenCalledWith("uninstall", {
      sourceIds: ["alpha"],
    });
  });
});

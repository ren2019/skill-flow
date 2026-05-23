import { describe, expect, test, vi } from "vitest";
import { SkillFlowApp } from "@skill-flow/query/runtime";
import * as githubCatalog from "@skill-flow/integration/utils/github-catalog";
import { executeBridgeRequest } from "../bridge-command.js";
import { PROTOCOL_VERSION } from "@skill-flow/shared-types/protocol";
import { createRepo, skillDoc, useSkillFlowSandbox } from "./test-helpers.js";

describe.sequential("bridge command dispatcher", () => {
  const sandbox = useSkillFlowSandbox();

  test("returns list envelope", async () => {
    const app = new SkillFlowApp();
    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "list",
      requestId: "r1",
    });

    expect(response.ok).toBe(true);
    expect(response.command).toBe("list");
    expect(response.requestId).toBe("r1");
    expect(response.data).toHaveProperty("summaries");
    expect(response.data).toHaveProperty("pinnedSourceIds");
  });

  test("restores the incoming caller context after executing a bridge request", async () => {
    const app = new SkillFlowApp();
    const previousCaller = process.env.SKILL_FLOW_CALLER;
    process.env.SKILL_FLOW_CALLER = "desktop-bridge";

    try {
      const response = await executeBridgeRequest(app, {
        protocolVersion: PROTOCOL_VERSION,
        command: "list",
        requestId: "caller-restore",
      });

      expect(response.ok).toBe(true);
      expect(process.env.SKILL_FLOW_CALLER).toBe("desktop-bridge");
    } finally {
      if (previousCaller === undefined) {
        delete process.env.SKILL_FLOW_CALLER;
      } else {
        process.env.SKILL_FLOW_CALLER = previousCaller;
      }
    }
  });

  test("restores the incoming caller context when request execution throws", async () => {
    const app = new SkillFlowApp();
    const previousCaller = process.env.SKILL_FLOW_CALLER;
    process.env.SKILL_FLOW_CALLER = "desktop-bridge";
    const listSpy = vi.spyOn(app, "listWorkflows").mockRejectedValue(new Error("boom"));

    try {
      await expect(
        executeBridgeRequest(app, {
          protocolVersion: PROTOCOL_VERSION,
          command: "list",
          requestId: "caller-restore-throw",
        }),
      ).resolves.toMatchObject({
        ok: false,
        errors: [{ code: "BRIDGE_REQUEST_INVALID" }],
      });
      expect(process.env.SKILL_FLOW_CALLER).toBe("desktop-bridge");
    } finally {
      listSpy.mockRestore();
      if (previousCaller === undefined) {
        delete process.env.SKILL_FLOW_CALLER;
      } else {
        process.env.SKILL_FLOW_CALLER = previousCaller;
      }
    }
  });

  test("returns pinned source ids in bootstrap payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code.", "Review"),
    });
    const app = new SkillFlowApp();
    const added = await app.addSource(repoPath, { sourceIdOverride: "demo-source" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return;
    }
    await app.store.togglePinnedSource(added.data.manifest.id);

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "bootstrap",
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("pinnedSourceIds", [added.data.manifest.id]);
  });

  test("rejects invalid apply payload", async () => {
    const app = new SkillFlowApp();
    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "apply",
      payload: { sourceId: "x" },
    });

    expect(response.ok).toBe(false);
    expect(response.errors[0]?.code).toBe("BRIDGE_REQUEST_INVALID");
  });

  test("accepts valid inspect payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "README.md": "# Alpha\n\nRoot docs.",
      "README.zh.md": "# Alpha 中文",
      "CHANGELOG.md": "# Changes",
      "skills/review/SKILL.md": skillDoc("review", "Review code.", "Review"),
      "skills/review/references/style.md": "---\ntitle: Style\n---\n# Style Guide",
    });
    const app = new SkillFlowApp();
    const added = await app.addSource(repoPath, { sourceIdOverride: "demo-source" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return;
    }

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "inspect",
      payload: { sourceId: added.data.manifest.id },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("summary");
    expect(response.data).not.toHaveProperty("sourceMetadata");
    expect(response.data).toHaveProperty("groupDocuments");
    expect(response.data).toHaveProperty("fileTree");
    const data = response.data as {
      groupDocuments: Array<{ id: string; title: string; content: string }>;
      fileTree: Array<{ title: string; children: Array<{ title: string }> }>;
      leafs: Array<{
        id: string;
        documentContent: string;
        documents: Array<{ title: string; content: string; metadata: Array<{ key: string; value: string }> }>;
      }>;
    };
    expect(data.groupDocuments.map((document) => document.title)).toEqual([
      "File Tree",
      "README.md",
      "README.zh.md",
      "CHANGELOG.md",
    ]);
    expect(data.groupDocuments[1]?.content).toContain("Root docs.");
    expect(data.fileTree.find((item) => item.title === "skills")?.children[0]?.title).toBe("review");
    expect(data.leafs[0]?.documentContent).toContain("# Review");
    expect(data.leafs[0]?.documents.map((document) => document.title)).toEqual([
      "SKILL.md",
      "references/style.md",
    ]);
    expect(data.leafs[0]?.documents[0]?.metadata).toEqual([
      { id: "name:review", key: "name", value: "review" },
      { id: "description:Review code.", key: "description", value: "Review code." },
    ]);
    expect(data.leafs[0]?.documents[1]?.metadata).toEqual([{ id: "title:Style", key: "title", value: "Style" }]);
  });

  test("accepts valid inspect-enrichment payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code."),
    });
    const app = new SkillFlowApp();
    const added = await app.addSource(repoPath, { sourceIdOverride: "demo-source" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return;
    }

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "inspect-enrichment",
      payload: { sourceId: added.data.manifest.id },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("sourceMetadata");
  });

  test("accepts valid add payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code."),
    });
    const app = new SkillFlowApp();

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "add",
      payload: {
        locator: repoPath,
        applyNow: false,
      },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("sourceId");
  });

  test("accepts valid toggle-pin payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code."),
    });
    const app = new SkillFlowApp();
    const added = await app.addSource(repoPath, { sourceIdOverride: "demo-source" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return;
    }

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "toggle-pin",
      payload: {
        sourceId: added.data.manifest.id,
      },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("pinnedSourceIds", [added.data.manifest.id]);
  });

  test("rejects invalid toggle-pin payload", async () => {
    const app = new SkillFlowApp();
    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "toggle-pin",
      payload: {},
    });

    expect(response.ok).toBe(false);
    expect(response.errors[0]?.code).toBe("BRIDGE_REQUEST_INVALID");
  });

  test("accepts valid apply payload with empty skill selection", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code."),
    });
    const app = new SkillFlowApp();
    const added = await app.addSource(repoPath, { sourceIdOverride: "demo-source" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return;
    }

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "apply",
      payload: {
        sourceId: added.data.manifest.id,
        draft: {
          selectedLeafIds: [],
          enabledTargets: [],
        },
      },
    });

    expect(response.ok).toBe(true);
  });

  test("apply bridge response includes fresh summary and inspect payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code."),
    });
    const app = new SkillFlowApp();
    const added = await app.addSource(repoPath, { sourceIdOverride: "demo-source" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      return;
    }

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "apply",
      payload: {
        sourceId: added.data.manifest.id,
        draft: {
          selectedLeafIds: [`${added.data.manifest.id}:skills/review`],
          enabledTargets: ["codex"],
        },
      },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("summary");
    expect(response.data).toHaveProperty("inspect");
  });

  test("apply forwards project scope payload", async () => {
    const app = new SkillFlowApp();
    const applySpy = vi.spyOn(app, "applyDraft").mockResolvedValue({
      ok: true,
      data: {
        actions: [],
        draft: { selectedLeafIds: ["alpha:a"], enabledTargets: ["codex"] },
      },
      warnings: [],
      errors: [],
    });

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "apply",
      payload: {
        sourceId: "alpha",
        scope: { kind: "project", projectId: "repo-a" },
        draft: {
          selectedLeafIds: ["alpha:a"],
          enabledTargets: ["codex"],
        },
      },
    });

    expect(response.ok).toBe(true);
    expect(applySpy).toHaveBeenCalledWith(
      "alpha",
      { selectedLeafIds: ["alpha:a"], enabledTargets: ["codex"] },
      { kind: "project", projectId: "repo-a" },
    );
  });

  test("rejects malformed project scope payload instead of downgrading to global", async () => {
    const app = new SkillFlowApp();
    const applySpy = vi.spyOn(app, "applyDraft");

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "apply",
      payload: {
        sourceId: "alpha",
        scope: { kind: "project" },
        draft: {
          selectedLeafIds: ["alpha:a"],
          enabledTargets: ["codex"],
        },
      },
    });

    expect(response.ok).toBe(false);
    expect(response.errors[0]?.code).toBe("BRIDGE_REQUEST_INVALID");
    expect(applySpy).not.toHaveBeenCalled();
  });

  test("accepts valid search-import-groups payload", async () => {
    vi.spyOn(githubCatalog, "fetchGitHubRepoDetails").mockResolvedValue({
      provider: "github",
      repoLabel: "anthropics/skills",
      repoUrl: "https://github.com/anthropics/skills",
      starCount: 406,
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        skills: [
          {
            id: "anthropic/skills/research",
            skillId: "research",
            name: "research",
            installs: 1200,
            source: "anthropic/skills",
          },
        ],
      }),
      text: async () => `
        <h1>anthropics<!-- -->/<!-- -->skills</h1>
        <span>18<!-- --> <!-- -->skills</span>
        <span>735.1K<!-- --> total installs</span>
        <a href="https://github.com/anthropics/skills">GitHub</a>
      `,
    })));

    const app = new SkillFlowApp();
    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "search-import-groups",
      payload: {
        query: "skills",
      },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("groups");
    expect(response.data).toHaveProperty("exact", false);
  });

  test("accepts valid preview-import-source payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => `
        <a href="/anthropics/skills/research"><h3>research</h3></a>
        <a href="/anthropics/skills/debugging"><h3>debugging</h3></a>
      `,
      json: async () => {
        throw new Error("not json");
      },
    })));

    const app = new SkillFlowApp();
    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "preview-import-source",
      payload: {
        locator: "anthropic/skills",
      },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("status", "ready");
  });

  test("accepts valid import-source payload", async () => {
    const repoPath = await createRepo(sandbox.sandboxRoot, {
      "skills/review/SKILL.md": skillDoc("review", "Review code."),
    });
    const app = new SkillFlowApp();

    const response = await executeBridgeRequest(app, {
      protocolVersion: PROTOCOL_VERSION,
      command: "import-source",
      payload: {
        locator: repoPath,
        draft: {
          selectedSkillIds: ["review"],
          enabledTargets: ["cursor"],
        },
      },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toHaveProperty("status", "ready");
  });
});

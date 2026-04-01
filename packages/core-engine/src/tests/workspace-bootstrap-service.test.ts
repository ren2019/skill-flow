import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { StateStore } from "@skill-flow/storage/store";
import { WorkspaceBootstrapService } from "../services/workspace-bootstrap-service.js";
import { useSkillFlowSandbox } from "./test-helpers.js";

describe.sequential("workspace bootstrap service", () => {
  const sandbox = useSkillFlowSandbox();

  test("reads agents origins from the cline target support path", async () => {
    const service = new WorkspaceBootstrapService(new StateStore()) as unknown as {
      readAgentsOrigins: () => Promise<Map<string, {
        originLocator: string | undefined;
        originRequestedPath: string | undefined;
        originBranch: string | undefined;
      }>>;
    };
    const lockPath = path.join(path.dirname(process.env.SKILL_FLOW_TARGET_CLINE!), ".skill-lock.json");

    await fs.writeFile(
      lockPath,
      JSON.stringify({
        skills: {
          browse: {
            sourceType: "github",
            source: "acme/skills",
            skillPath: "skills/browse",
            sourceUrl: "https://github.com/acme/skills/tree/main",
          },
        },
      }),
      "utf8",
    );

    const origins = await service.readAgentsOrigins();

    expect(origins.get("browse")).toEqual({
      originLocator: "https://github.com/acme/skills.git",
      originRequestedPath: "skills/browse",
      originBranch: "main",
    });
  });
});

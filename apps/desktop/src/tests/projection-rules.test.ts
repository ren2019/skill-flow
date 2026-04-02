import { describe, expect, it } from "vitest";
import {
  buildProjectionNameMap,
  type ProjectionDraftState,
  type ProjectionSourceSummary,
} from "../store/projection-rules";

describe("projection rules", () => {
  it("produces deterministic projected names for duplicates and conflicts", () => {
    const drafts: Record<string, ProjectionDraftState> = {
      alpha: {
        enabledTargets: ["claude-code"],
        selectedLeafIds: ["alpha-a", "alpha-b"],
      },
      beta: {
        enabledTargets: ["claude-code"],
        selectedLeafIds: ["beta-a", "beta-b"],
      },
    };

    const names = buildProjectionNameMap({
      summaries: makeSummaries(),
      drafts,
      sourceId: "alpha",
    });

    expect(names).toEqual({
      "alpha-a": "browse",
      "alpha-b": "AlphaHub-browse",
      "beta-a": "BetaHub-browse",
      "beta-b": "acme-BetaHub-browse",
    });
  });

  it("keeps current-source names when no other targets overlap", () => {
    const drafts: Record<string, ProjectionDraftState> = {
      alpha: {
        enabledTargets: ["codex"],
        selectedLeafIds: ["alpha-a"],
      },
      beta: {
        enabledTargets: ["claude-code"],
        selectedLeafIds: ["beta-a"],
      },
    };

    expect(
      buildProjectionNameMap({
        summaries: makeSummaries(),
        drafts,
        sourceId: "alpha",
      }),
    ).toEqual({
      "alpha-a": "browse",
    });
  });
});

function makeSummaries(): ProjectionSourceSummary[] {
  return [
    {
      sourceId: "alpha",
      displayName: "AlphaHub",
      locator: "https://github.com/acme/alpha-hub",
      leafs: [
        { id: "alpha-a", linkName: "browse", name: "browse", description: "Browse things." },
        { id: "alpha-b", linkName: "browse", name: "browse", description: "Browse other things." },
      ],
    },
    {
      sourceId: "beta",
      displayName: "BetaHub",
      locator: "https://github.com/acme/beta-hub",
      leafs: [
        { id: "beta-a", linkName: "browse", name: "browse", description: "Browse things." },
        { id: "beta-b", linkName: "browse", name: "browse", description: "Browse alternate things." },
      ],
    },
  ];
}

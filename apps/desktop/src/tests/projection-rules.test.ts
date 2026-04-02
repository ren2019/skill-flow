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
      "beta-a": "browse",
      "beta-b": "BetaHub-browse",
    });
  });

  it("excludes the current source when resolving projected names", () => {
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
    ).toEqual({});
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

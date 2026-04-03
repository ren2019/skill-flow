import { describe, expect, it } from "vitest";
import recommendations from "../assets/ImportRecommendations/recommendations.json";

type RecommendationEntry = {
  canonicalRepo: string;
  locator: string;
  categoryId: string;
  primaryTagId: string;
  secondaryTagIds: string[];
  descriptionKey: string;
  sortOrder: number;
};

const typedRecommendations = recommendations as RecommendationEntry[];

describe("import recommendations", () => {
  it("loads the bundled recommendation configuration", () => {
    expect(typedRecommendations.length).toBeGreaterThan(0);
    expect(
      typedRecommendations.some((entry) => entry.canonicalRepo === "anthropics/skills"),
    ).toBe(true);
  });

  it("uses the primary tag as the only grouping category", () => {
    expect(typedRecommendations.length).toBeGreaterThan(0);

    for (const entry of typedRecommendations) {
      expect(entry.categoryId).toBe(entry.primaryTagId);
      expect(entry.secondaryTagIds.length).toBeLessThanOrEqual(2);
      expect(entry.secondaryTagIds).not.toContain(entry.primaryTagId);
    }
  });
});

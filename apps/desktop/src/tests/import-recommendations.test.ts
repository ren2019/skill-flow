import { describe, expect, it } from "vitest";
import recommendations from "../assets/ImportRecommendations/recommendations.json";
import { localize } from "../i18n";

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

  it("resolves recommendation descriptions, categories, and tags in all supported locales", () => {
    for (const locale of ["en", "zh-Hans", "ja"] as const) {
      for (const entry of typedRecommendations) {
        expect(localize(entry.descriptionKey, locale)).not.toBe(entry.descriptionKey);
        expect(localize(`import.recommendation.category.${entry.categoryId}`, locale)).not.toBe(
          `import.recommendation.category.${entry.categoryId}`,
        );

        for (const tagId of [entry.primaryTagId, ...entry.secondaryTagIds]) {
          expect(localize(`import.recommendation.tag.${tagId}`, locale)).not.toBe(
            `import.recommendation.tag.${tagId}`,
          );
        }
      }
    }
  });
});

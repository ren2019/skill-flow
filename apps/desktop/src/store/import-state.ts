import type { ResourcePhase } from "./async-resource-state";

export type ImportDraftState = {
  selectedSkillIds: string[];
  enabledTargetIds: string[];
};

export type ImportSkillState = {
  id: string;
  title?: string;
  summary?: string;
  selectedByDefault: boolean;
};

export type ImportTargetState = {
  id: string;
  selectedByDefault: boolean;
};

export type ImportRecommendationBadgeState = {
  id: string;
  title: string;
  isPrimary: boolean;
};

export type ImportGroupState = {
  id: string;
  title: string;
  locator: string;
  canonicalRepo?: string;
  isInstalledLocally?: boolean;
  skillCount?: number;
  downloadCount?: number;
  starCount?: number;
  repoUrl?: string;
  categoryId?: string;
  categoryTitle?: string;
  recommendationDescription?: string;
  recommendationBadgeItems?: ImportRecommendationBadgeState[];
  previewPhase: ResourcePhase;
  skills: ImportSkillState[];
  targets: ImportTargetState[];
};

export type ImportState = {
  draftsByItemId: Record<string, ImportDraftState>;
  importSubmittedQuery: string;
  importSearchPhase: ResourcePhase;
  recommendedGroups: ImportGroupState[];
  searchGroups: ImportGroupState[];
};

export function createImportState(seed: Partial<ImportState> = {}): ImportState {
  return {
    draftsByItemId: { ...(seed.draftsByItemId ?? {}) },
    importSubmittedQuery: seed.importSubmittedQuery ?? "",
    importSearchPhase: seed.importSearchPhase ?? { kind: "idle" },
    recommendedGroups: [...(seed.recommendedGroups ?? [])],
    searchGroups: [...(seed.searchGroups ?? [])],
  };
}

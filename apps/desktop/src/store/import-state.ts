import type { ResourcePhase } from "./async-resource-state";

export type ImportDraftState = {
  selectedSkillIds: string[];
  enabledTargetIds: string[];
};

export type ImportSkillState = {
  id: string;
  selectedByDefault: boolean;
};

export type ImportTargetState = {
  id: string;
  selectedByDefault: boolean;
};

export type ImportGroupState = {
  id: string;
  title: string;
  locator: string;
  isInstalledLocally?: boolean;
  categoryId?: string;
  categoryTitle?: string;
  recommendationDescription?: string;
  previewPhase: ResourcePhase;
  skills: ImportSkillState[];
  targets: ImportTargetState[];
};

export type ImportState = {
  draftsByItemId: Record<string, ImportDraftState>;
  importSubmittedQuery: string;
  importSearchText: string;
  importPlaceholderIndex: number;
  importSearchPhase: ResourcePhase;
  recommendedGroups: ImportGroupState[];
  searchGroups: ImportGroupState[];
};

export function createImportState(seed: Partial<ImportState> = {}): ImportState {
  return {
    draftsByItemId: { ...(seed.draftsByItemId ?? {}) },
    importSubmittedQuery: seed.importSubmittedQuery ?? "",
    importSearchText: seed.importSearchText ?? "",
    importPlaceholderIndex: seed.importPlaceholderIndex ?? 0,
    importSearchPhase: seed.importSearchPhase ?? { kind: "idle" },
    recommendedGroups: [...(seed.recommendedGroups ?? [])],
    searchGroups: [...(seed.searchGroups ?? [])],
  };
}

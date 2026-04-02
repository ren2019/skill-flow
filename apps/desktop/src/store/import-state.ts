export type ImportDraftState = {
  selectedSkillIds: string[];
  enabledTargetIds: string[];
};

export type ImportState = {
  draftsByItemId: Record<string, ImportDraftState>;
};

export function createImportState(seed: Partial<ImportState> = {}): ImportState {
  return {
    draftsByItemId: { ...(seed.draftsByItemId ?? {}) },
  };
}

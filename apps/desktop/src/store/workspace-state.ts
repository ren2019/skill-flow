export type InventorySummaryState = {
  sourceId: string;
  title: string;
  locator: string;
  health: string;
  warningCount: number;
  errorCount: number;
  skillCount: number;
  enabledSkillCount: number;
  activeTargetCount: number;
  byline?: string;
};

export type WorkspaceState = {
  sourceIds: string[];
  pinnedSourceIds: string[];
  inventorySummaries: InventorySummaryState[];
};

export function createWorkspaceState(seed: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    sourceIds: [...(seed.sourceIds ?? [])],
    pinnedSourceIds: [...(seed.pinnedSourceIds ?? [])],
    inventorySummaries: [...(seed.inventorySummaries ?? [])],
  };
}

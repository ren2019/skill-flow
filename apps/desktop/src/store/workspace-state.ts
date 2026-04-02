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
  downloadCount?: number;
  starCount?: number;
  repoUrl?: string;
  groupPath?: string;
};

export type WorkspaceTagPreference = {
  id: string;
  title: string;
  accent?: string;
};

export type WorkspaceState = {
  sourceIds: string[];
  pinnedSourceIds: string[];
  inventorySummaries: InventorySummaryState[];
  customTagsBySourceId: Record<string, WorkspaceTagPreference[]>;
  selectedHomeTagFilterId: string | undefined;
};

export function createWorkspaceState(seed: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    sourceIds: [...(seed.sourceIds ?? [])],
    pinnedSourceIds: [...(seed.pinnedSourceIds ?? [])],
    inventorySummaries: [...(seed.inventorySummaries ?? [])],
    customTagsBySourceId: Object.fromEntries(
      Object.entries(seed.customTagsBySourceId ?? {}).map(([sourceId, tags]) => [sourceId, [...tags]]),
    ),
    selectedHomeTagFilterId: seed.selectedHomeTagFilterId,
  };
}

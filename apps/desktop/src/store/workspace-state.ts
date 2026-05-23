export type InventorySelectionState = "empty" | "partial" | "full";

export type InventorySkillState = {
  id: string;
  title: string;
  isEnabled: boolean;
};

export type InventoryTargetState = {
  id: string;
  label: string;
  shortLabel: string;
  isEnabled: boolean;
};

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
  enabledTargetLabels?: string[];
  selectedSkillNames?: string[];
  skillSelection?: InventorySelectionState;
  targetSelection?: InventorySelectionState;
  skillsLoading?: boolean;
  targetsLoading?: boolean;
  skills?: InventorySkillState[];
  targets?: InventoryTargetState[];
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

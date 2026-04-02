export type WorkspaceState = {
  sourceIds: string[];
  pinnedSourceIds: string[];
};

export function createWorkspaceState(seed: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    sourceIds: [...(seed.sourceIds ?? [])],
    pinnedSourceIds: [...(seed.pinnedSourceIds ?? [])],
  };
}

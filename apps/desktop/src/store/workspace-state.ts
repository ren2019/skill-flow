export type WorkspaceState = {
  sourceIds: string[];
};

export function createWorkspaceState(seed: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    sourceIds: [...(seed.sourceIds ?? [])],
  };
}

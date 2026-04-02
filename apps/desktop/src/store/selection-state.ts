export type SelectionState = "empty" | "partial" | "full";

export type TreeSelectionState = {
  allLeafIds: string[];
  selectedLeafIds: string[];
};

export function selectionState(allIds: string[], selectedIds: string[]): SelectionState {
  return getParentSelectionState({
    allLeafIds: allIds,
    selectedLeafIds: selectedIds,
  });
}

export function getParentSelectionState(state: TreeSelectionState): SelectionState {
  if (state.selectedLeafIds.length === 0) {
    return "empty";
  }
  if (state.selectedLeafIds.length === state.allLeafIds.length) {
    return "full";
  }
  return "partial";
}

export function toggleParent(state: TreeSelectionState): TreeSelectionState {
  return getParentSelectionState(state) === "full"
    ? { allLeafIds: state.allLeafIds, selectedLeafIds: [] }
    : { allLeafIds: state.allLeafIds, selectedLeafIds: [...state.allLeafIds] };
}

export function toggleChild(state: TreeSelectionState, leafId: string): TreeSelectionState {
  const selected = new Set(state.selectedLeafIds);
  if (selected.has(leafId)) {
    selected.delete(leafId);
  } else {
    selected.add(leafId);
  }

  return {
    allLeafIds: state.allLeafIds,
    selectedLeafIds: state.allLeafIds.filter((id) => selected.has(id)),
  };
}

import { createAsyncResourceState, type AsyncResourceState } from "./async-resource-state";
import { createDetailState, type DetailState } from "./detail-state";
import { createImportState, type ImportState } from "./import-state";
import { createSettingsState, type SettingsState } from "./settings-state";
import { createViewState, type ViewState } from "./view-state";
import { createWorkspaceState, type WorkspaceState } from "./workspace-state";

export type DesktopAppState = {
  workspace: WorkspaceState;
  view: ViewState;
  detailState: DetailState;
  importState: ImportState;
  settings: SettingsState;
  asyncResources: AsyncResourceState;
};

export type DesktopAppStateSeed = {
  workspace?: Partial<WorkspaceState>;
  view?: Partial<ViewState>;
  detailState?: Partial<DetailState>;
  importState?: Partial<ImportState>;
  settings?: Partial<SettingsState>;
  asyncResources?: Partial<AsyncResourceState>;
};

export function createDesktopAppState(seed: DesktopAppStateSeed = {}): DesktopAppState {
  return {
    workspace: createWorkspaceState(seed.workspace),
    view: createViewState(seed.view),
    detailState: createDetailState(seed.detailState),
    importState: createImportState(seed.importState),
    settings: createSettingsState(seed.settings),
    asyncResources: createAsyncResourceState(seed.asyncResources),
  };
}

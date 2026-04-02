import type { DesktopAppState } from "../store/desktop-app-state";
import type { ImportDraftState } from "../store/import-state";
import type { DesktopRoute } from "../navigation/desktop-route";

export class ImportViewModel {
  constructor(private readonly state: DesktopAppState) {}

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get draftsByItemId(): Record<string, ImportDraftState> {
    return this.state.importState.draftsByItemId;
  }
}

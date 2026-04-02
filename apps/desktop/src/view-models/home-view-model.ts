import type { DesktopAppState } from "../store/desktop-app-state";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";

export class HomeViewModel {
  constructor(private readonly state: DesktopAppState) {}

  get sourceIds(): string[] {
    return this.state.workspace.sourceIds;
  }

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get homeBootstrapPhase(): ResourcePhase {
    return this.state.asyncResources.homeBootstrapPhase;
  }
}

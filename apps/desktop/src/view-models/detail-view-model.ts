import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";
import type { DesktopAppState } from "../store/desktop-app-state";

export class DetailViewModel {
  constructor(private readonly state: DesktopAppState) {}

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get sourceId(): string | undefined {
    if (this.state.view.selectedSourceId) {
      return this.state.view.selectedSourceId;
    }
    return this.state.view.currentRoute.kind === "detail" ? this.state.view.currentRoute.sourceId : undefined;
  }

  showSource(sourceId: string) {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      return;
    }
    this.state.view.selectedSourceId = normalizedSourceId;
    this.state.view.currentRoute = desktopRoute.detail(normalizedSourceId);
  }
}

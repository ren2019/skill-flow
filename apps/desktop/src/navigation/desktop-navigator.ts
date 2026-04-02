import { desktopRoute } from "./desktop-route";
import type { DesktopAppState } from "../store/desktop-app-state";

export class DesktopNavigator {
  constructor(private readonly state: DesktopAppState) {}

  get currentRoute() {
    return this.state.view.currentRoute;
  }

  showHome() {
    this.state.view.currentRoute = desktopRoute.home();
  }

  showDetail(sourceId: string) {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      return;
    }
    this.state.view.selectedSourceId = normalizedSourceId;
    this.state.view.currentRoute = desktopRoute.detail(normalizedSourceId);
  }

  showImportPage() {
    this.state.view.currentRoute = desktopRoute.importPage();
  }

  showSettings() {
    this.state.view.currentRoute = desktopRoute.settings();
  }
}

import type { DesktopAppState } from "../store/desktop-app-state";
import { DesktopNavigator } from "../navigation/desktop-navigator";
import type { DesktopRoute } from "../navigation/desktop-route";

export class MainViewModel {
  readonly navigator: DesktopNavigator;

  constructor(private readonly state: DesktopAppState) {
    this.navigator = new DesktopNavigator(state);
  }

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get sourceIds(): string[] {
    return this.state.workspace.sourceIds;
  }

  get selectedSourceId(): string | undefined {
    return this.state.view.selectedSourceId;
  }

  showHome() {
    this.navigator.showHome();
  }

  showDetail(sourceId: string) {
    this.navigator.showDetail(sourceId);
  }

  showImportPage() {
    this.navigator.showImportPage();
  }

  showMenuQuickConfig() {
    this.state.view.currentRoute = { kind: "menuQuickConfig" };
  }

  showSettings() {
    this.navigator.showSettings();
  }
}

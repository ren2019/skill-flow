import type { DesktopAppState } from "../store/desktop-app-state";
import { DesktopNavigator } from "../navigation/desktop-navigator";
import type { DesktopRoute } from "../navigation/desktop-route";
import { normalizeAgentDisplayPreferences } from "../runtime/settings-store";

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

  get detectedTargetIdsForSettings(): string[] {
    const detectedTargetIds = new Set<string>();
    for (const summary of this.state.workspace.inventorySummaries) {
      for (const target of summary.targets ?? []) {
        if (target.id.trim()) {
          detectedTargetIds.add(target.id);
        }
      }
    }
    for (const detail of Object.values(this.state.detailState.detailsBySourceId)) {
      for (const target of detail.targets) {
        if (target.id.trim()) {
          detectedTargetIds.add(target.id);
        }
      }
    }

    return normalizeAgentDisplayPreferences([], this.state.settings.customAgents)
      .map((preference) => preference.targetId)
      .filter((targetId) => detectedTargetIds.has(targetId));
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

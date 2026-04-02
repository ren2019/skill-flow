import type { DesktopAppState } from "../store/desktop-app-state";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";
import type { ProjectScopeSelection } from "../store/settings-state";

type HomeViewModelOptions = {
  refreshList?: () => Promise<void>;
  updateGroup?: (sourceId: string) => Promise<void>;
};

export class HomeViewModel {
  private readonly refreshList: () => Promise<void>;
  private readonly updateGroup: (sourceId: string) => Promise<void>;

  constructor(
    private readonly state: DesktopAppState,
    options: HomeViewModelOptions = {},
  ) {
    this.refreshList = options.refreshList ?? (async () => undefined);
    this.updateGroup = options.updateGroup ?? (async () => undefined);
  }

  get sourceIds(): string[] {
    return this.state.workspace.sourceIds;
  }

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get homeBootstrapPhase(): ResourcePhase {
    return this.state.asyncResources.homeBootstrapPhase;
  }

  get pinnedSourceIds(): string[] {
    return this.state.workspace.pinnedSourceIds;
  }

  get selectedProjectScope(): ProjectScopeSelection {
    return this.state.settings.selectedProjectScope;
  }

  async refresh(): Promise<void> {
    await this.refreshList();
  }

  async updateAllGroupsFromHome(): Promise<void> {
    for (const sourceId of this.sourceIds.filter((candidate) => candidate.trim().length > 0)) {
      await this.updateGroup(sourceId);
    }
  }

  async updateCurrentGroup(): Promise<boolean> {
    const sourceId = this.state.view.selectedSourceId?.trim();
    if (!sourceId) {
      return false;
    }
    await this.updateGroup(sourceId);
    return true;
  }

  togglePinned(sourceId: string): void {
    if (this.state.workspace.pinnedSourceIds.includes(sourceId)) {
      this.state.workspace.pinnedSourceIds = this.state.workspace.pinnedSourceIds.filter(
        (candidate) => candidate !== sourceId,
      );
      return;
    }

    this.state.workspace.pinnedSourceIds = [...this.state.workspace.pinnedSourceIds, sourceId];
  }

  isPinned(sourceId: string): boolean {
    return this.state.workspace.pinnedSourceIds.includes(sourceId);
  }

  async selectProjectScope(scope: ProjectScopeSelection): Promise<void> {
    this.state.settings.selectedProjectScope = scope;
  }
}

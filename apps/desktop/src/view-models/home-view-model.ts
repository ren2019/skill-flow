import type { DesktopAppState } from "../store/desktop-app-state";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";
import type { ProjectScopeSelection } from "../store/settings-state";

type HomeViewModelOptions = {
  refreshList?: () => Promise<void>;
  updateGroup?: (sourceId: string) => Promise<void>;
  onChange?: () => void;
};

export class HomeViewModel {
  private readonly refreshList: () => Promise<void>;
  private readonly updateGroup: (sourceId: string) => Promise<void>;
  private readonly onChange: () => void;

  constructor(
    private readonly state: DesktopAppState,
    options: HomeViewModelOptions = {},
  ) {
    this.refreshList = options.refreshList ?? (async () => undefined);
    this.updateGroup = options.updateGroup ?? (async () => undefined);
    this.onChange = options.onChange ?? (() => undefined);
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
    this.onChange();
  }

  async updateAllGroupsFromHome(): Promise<void> {
    for (const sourceId of this.sourceIds.filter((candidate) => candidate.trim().length > 0)) {
      await this.updateGroup(sourceId);
    }
    this.onChange();
  }

  async updateCurrentGroup(): Promise<boolean> {
    const sourceId = this.state.view.selectedSourceId?.trim();
    if (!sourceId) {
      return false;
    }
    await this.updateSource(sourceId);
    this.onChange();
    return true;
  }

  async updateSource(sourceId: string): Promise<void> {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      return;
    }
    this.state.view.selectedSourceId = normalizedSourceId;
    await this.updateGroup(normalizedSourceId);
    this.onChange();
  }

  togglePinned(sourceId: string): void {
    if (this.state.workspace.pinnedSourceIds.includes(sourceId)) {
      this.state.workspace.pinnedSourceIds = this.state.workspace.pinnedSourceIds.filter(
        (candidate) => candidate !== sourceId,
      );
      this.onChange();
      return;
    }

    this.state.workspace.pinnedSourceIds = [...this.state.workspace.pinnedSourceIds, sourceId];
    this.onChange();
  }

  isPinned(sourceId: string): boolean {
    return this.state.workspace.pinnedSourceIds.includes(sourceId);
  }

  async selectProjectScope(scope: ProjectScopeSelection): Promise<void> {
    this.state.settings.selectedProjectScope = scope;
    this.onChange();
  }

  openDetail(sourceId: string): void {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      return;
    }
    this.state.view.selectedSourceId = normalizedSourceId;
    this.state.view.currentRoute = { kind: "detail", sourceId: normalizedSourceId };
    this.onChange();
  }
}

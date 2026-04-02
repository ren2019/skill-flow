import type { DesktopAppState } from "../store/desktop-app-state";
import { localize } from "../i18n";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";
import type { ProjectScopeSelection, RecentProjectScopeItem } from "../store/settings-state";
import {
  createPassthroughMutationCoordinator,
  type MutationCoordinator,
} from "../runtime/mutation-coordinator";

type HomeViewModelOptions = {
  refreshList?: () => Promise<void>;
  updateGroup?: (sourceId: string) => Promise<void>;
  mutationCoordinator?: MutationCoordinator;
  onChange?: () => void;
};

export class HomeViewModel {
  private internalSearchQuery = "";
  private internalShowsProjectScopeBar = false;
  private readonly refreshList: () => Promise<void>;
  private readonly updateGroup: (sourceId: string) => Promise<void>;
  private readonly mutationCoordinator: MutationCoordinator;
  private readonly onChange: () => void;

  constructor(
    private readonly state: DesktopAppState,
    options: HomeViewModelOptions = {},
  ) {
    this.refreshList = options.refreshList ?? (async () => undefined);
    this.updateGroup = options.updateGroup ?? (async () => undefined);
    this.mutationCoordinator =
      options.mutationCoordinator ?? createPassthroughMutationCoordinator();
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

  get recentProjectScopes(): RecentProjectScopeItem[] {
    return this.state.settings.recentProjectScopes;
  }

  get toastMessage(): string | undefined {
    return this.state.view.toastMessage;
  }

  get searchQuery(): string {
    return this.internalSearchQuery;
  }

  set searchQuery(value: string) {
    this.internalSearchQuery = value;
    this.onChange();
  }

  get showsProjectScopeBar(): boolean {
    return this.internalShowsProjectScopeBar;
  }

  get filteredSourceIds(): string[] {
    const query = this.internalSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.sourceIds;
    }

    return this.sourceIds.filter((sourceId) => sourceId.toLowerCase().includes(query));
  }

  get desktopLanguage(): string {
    return this.state.settings.desktopLanguageRawValue;
  }

  showImportPage(): void {
    this.state.view.currentRoute = { kind: "importPage" };
    this.onChange();
  }

  showSettings(): void {
    this.state.view.currentRoute = { kind: "settings" };
    this.onChange();
  }

  toggleProjectScopeBar(): void {
    this.internalShowsProjectScopeBar = !this.internalShowsProjectScopeBar;
    this.onChange();
  }

  async refresh(): Promise<void> {
    await this.runWithToast(async () => {
      await this.refreshList();
      this.onChange();
    });
  }

  async updateAllGroupsFromHome(): Promise<void> {
    await this.runWithToast(async () => {
      await this.mutationCoordinator.run(async () => {
        for (const sourceId of this.sourceIds.filter((candidate) => candidate.trim().length > 0)) {
          await this.updateGroup(sourceId);
        }
      });
      this.onChange();
    });
  }

  async updateCurrentGroup(): Promise<boolean> {
    const sourceId = this.state.view.selectedSourceId?.trim();
    if (!sourceId) {
      this.state.view.toastMessage = localize("error.no_group_selected", this.desktopLanguage);
      this.onChange();
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
    await this.runWithToast(async () => {
      this.state.view.toastMessage = undefined;
      this.state.view.selectedSourceId = normalizedSourceId;
      await this.mutationCoordinator.run(() => this.updateGroup(normalizedSourceId));
      this.onChange();
    });
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

  private async runWithToast(action: () => Promise<void>): Promise<void> {
    try {
      this.state.view.toastMessage = undefined;
      await action();
      this.state.view.toastMessage = undefined;
    } catch (error) {
      this.state.view.toastMessage =
        error instanceof Error
          ? error.message
          : localize("error.operation_failed", this.desktopLanguage);
      this.onChange();
    }
  }
}

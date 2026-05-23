import type { DesktopAppState } from "../store/desktop-app-state";
import { localize } from "../i18n";
import type { DesktopGroupTagStore } from "../runtime/group-tag-store";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";
import type { ProjectScopeSelection, RecentProjectScopeItem } from "../store/settings-state";
import type { InventorySelectionState, InventorySummaryState, WorkspaceTagPreference } from "../store/workspace-state";
import type { DesktopAccentColor, DesktopThemeMode } from "../theme/app-theme";
import {
  createPassthroughMutationCoordinator,
  type MutationCoordinator,
} from "../runtime/mutation-coordinator";
import { GroupTagController } from "./group-tag-controller";

type HomeViewModelOptions = {
  refreshList?: () => Promise<void>;
  updateGroup?: (sourceId: string) => Promise<unknown>;
  updateGroups?: (sourceIds: string[]) => Promise<unknown>;
  updateSelection?: (
    sourceId: string,
    draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
  ) => Promise<void>;
  togglePinnedSource?: (sourceId: string) => Promise<string[] | undefined>;
  deleteSource?: (sourceId: string) => Promise<void>;
  openExternalUrl?: (url: string) => Promise<void>;
  openPath?: (path: string) => Promise<void>;
  persistSettings?: () => void;
  groupTagStore?: Pick<DesktopGroupTagStore, "loadCustomTags" | "saveCustomTags">;
  mutationCoordinator?: MutationCoordinator;
  onChange?: () => void;
};

export class HomeViewModel {
  private internalSearchQuery = "";
  private internalShowsProjectScopeBar = false;
  private readonly refreshList: () => Promise<void>;
  private readonly updateGroup: (sourceId: string) => Promise<unknown>;
  private readonly updateGroups: ((sourceIds: string[]) => Promise<unknown>) | undefined;
  private readonly updateSelection: (
    sourceId: string,
    draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
  ) => Promise<void>;
  private readonly togglePinnedSource: (sourceId: string) => Promise<string[] | undefined>;
  private readonly deleteSourceCommand: (sourceId: string) => Promise<void>;
  private readonly openExternalUrl: (url: string) => Promise<void>;
  private readonly openPath: (path: string) => Promise<void>;
  private readonly persistSettings: () => void;
  private readonly mutationCoordinator: MutationCoordinator;
  private readonly onChange: () => void;
  private readonly groupTags: GroupTagController;
  private readonly updatingSourceIds = new Set<string>();

  constructor(
    private readonly state: DesktopAppState,
    options: HomeViewModelOptions = {},
  ) {
    this.refreshList = options.refreshList ?? (async () => undefined);
    this.updateGroup = options.updateGroup ?? (async () => undefined);
    this.updateGroups = options.updateGroups;
    this.updateSelection = options.updateSelection ?? (async () => undefined);
    this.togglePinnedSource = options.togglePinnedSource ?? (async () => undefined);
    this.deleteSourceCommand = options.deleteSource ?? (async () => undefined);
    this.openExternalUrl = options.openExternalUrl ?? (async () => undefined);
    this.openPath = options.openPath ?? (async () => undefined);
    this.persistSettings = options.persistSettings ?? (() => undefined);
    this.mutationCoordinator =
      options.mutationCoordinator ?? createPassthroughMutationCoordinator();
    this.onChange = options.onChange ?? (() => undefined);
    this.groupTags = new GroupTagController(this.state, {
      ...(options.groupTagStore ? { groupTagStore: options.groupTagStore } : {}),
      language: () => this.desktopLanguage,
      onChange: this.onChange,
    });
  }

  get sourceIds(): string[] {
    return this.state.workspace.sourceIds;
  }

  get inventoryCards(): InventorySummaryState[] {
    return this.cardsMatching({
      query: this.internalSearchQuery,
      appliesSelectedTag: true,
    });
  }

  menuInventoryCards(searchQuery: string): InventorySummaryState[] {
    return this.cardsMatching({
      query: searchQuery,
      appliesSelectedTag: false,
    });
  }

  private cardsMatching({ query, appliesSelectedTag }: { query: string; appliesSelectedTag: boolean }): InventorySummaryState[] {
    if (this.state.workspace.inventorySummaries.length > 0) {
      return this.state.workspace.inventorySummaries
        .filter((card) => !appliesSelectedTag || this.matchesSelectedTag(card.sourceId))
        .filter((card) => this.matchesCardSearch(card, query));
    }

    return this.sourceIds
      .filter((sourceId) => sourceId.toLowerCase().includes(query.trim().toLowerCase()))
      .map((sourceId) => ({
        sourceId,
        title: sourceId,
        locator: sourceId,
        health: "HEALTHY",
        warningCount: 0,
        errorCount: 0,
        skillCount: 0,
        enabledSkillCount: 0,
        activeTargetCount: 0,
      }));
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

  get homeTagFilters(): WorkspaceTagPreference[] {
    return this.groupTags.homeTagFilters(this.sourceIds);
  }

  get homeTagCountById(): Record<string, number> {
    return this.groupTags.homeTagCountById(this.sourceIds);
  }

  get selectedHomeTagFilterId(): string | undefined {
    return this.groupTags.selectedHomeTagFilterId;
  }

  get themeMode(): DesktopThemeMode {
    return this.state.settings.themeModeRawValue as DesktopThemeMode;
  }

  get themeAccent(): DesktopAccentColor {
    return this.state.settings.themeAccentRawValue as DesktopAccentColor;
  }

  get homeCardDensity(): string {
    return this.state.settings.homeCardDensityRawValue;
  }

  get menuCardDensity(): string {
    return this.state.settings.menuCardDensityRawValue;
  }

  isUpdatingSource(sourceId: string): boolean {
    return this.updatingSourceIds.has(sourceId);
  }

  showImportPage(): void {
    this.state.view.currentRoute = { kind: "importPage" };
    this.onChange();
  }

  showHome(): void {
    this.state.view.currentRoute = { kind: "home" };
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
      this.state.asyncResources.homeBootstrapPhase = { kind: "loading" };
      await this.refreshList();
      this.reconcileSelectedSource();
      this.state.asyncResources.homeBootstrapPhase = { kind: "ready" };
      this.onChange();
    });
  }

  async updateAllGroupsFromHome(): Promise<void> {
    const sourceIds = this.sourceIds.filter((candidate) => candidate.trim().length > 0);
    if (sourceIds.length === 0) {
      this.state.view.toastMessage = localize("toast.update.none", this.desktopLanguage);
      this.onChange();
      return;
    }

    try {
      this.state.view.toastMessage = undefined;
      for (const sourceId of sourceIds) {
        this.updatingSourceIds.add(sourceId);
      }
      this.onChange();
      let updateSummary: unknown;
      await this.mutationCoordinator.run(async () => {
        if (this.updateGroups) {
          updateSummary = await this.updateGroups(sourceIds);
          return;
        }

        const updateResults: unknown[] = [];
        for (const sourceId of sourceIds) {
          updateResults.push(await this.updateGroup(sourceId));
        }
        updateSummary = mergeUpdateResults(updateResults);
      });
      this.state.view.toastMessage = this.formatUpdateSummaryToast(updateSummary, sourceIds.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.view.toastMessage = localize("toast.update.failed", this.desktopLanguage).replace("%@", message);
    } finally {
      for (const sourceId of sourceIds) {
        this.updatingSourceIds.delete(sourceId);
      }
      this.onChange();
    }
  }

  async updateCurrentGroup(): Promise<boolean> {
    const sourceId = this.state.view.selectedSourceId?.trim();
    if (!sourceId) {
      this.state.view.toastMessage = localize("toast.update.no_group_selected", this.desktopLanguage);
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
    try {
      this.state.view.toastMessage = undefined;
      this.state.view.selectedSourceId = normalizedSourceId;
      this.updatingSourceIds.add(normalizedSourceId);
      this.onChange();
      let updateSummary: unknown;
      await this.mutationCoordinator.run(async () => {
        updateSummary = await this.updateGroup(normalizedSourceId);
      });
      this.state.view.toastMessage = this.formatUpdateSummaryToast(updateSummary, 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.view.toastMessage = localize("toast.update.failed", this.desktopLanguage).replace("%@", message);
    } finally {
      this.updatingSourceIds.delete(normalizedSourceId);
      this.onChange();
    }
  }

  async togglePinned(sourceId: string): Promise<void> {
    const previousPinnedSourceIds = this.state.workspace.pinnedSourceIds;
    if (previousPinnedSourceIds.includes(sourceId)) {
      this.state.workspace.pinnedSourceIds = previousPinnedSourceIds.filter(
        (candidate) => candidate !== sourceId,
      );
    } else {
      this.state.workspace.pinnedSourceIds = [...previousPinnedSourceIds, sourceId];
    }
    this.onChange();

    try {
      const persistedPinnedSourceIds = await this.togglePinnedSource(sourceId);
      if (persistedPinnedSourceIds) {
        this.state.workspace.pinnedSourceIds = persistedPinnedSourceIds;
      }
      this.onChange();
    } catch (error) {
      this.state.workspace.pinnedSourceIds = previousPinnedSourceIds;
      const message = error instanceof Error ? error.message : String(error);
      this.state.view.toastMessage =
        localize("toast.pin.failed", this.desktopLanguage).replace("%@", message);
      this.onChange();
    }
  }

  isPinned(sourceId: string): boolean {
    return this.state.workspace.pinnedSourceIds.includes(sourceId);
  }

  async selectProjectScope(scope: ProjectScopeSelection): Promise<void> {
    const normalizedScope = scope.kind === "project" && this.state.settings.recentProjectScopes.some((item) => item.projectId === scope.projectId)
      ? scope
      : { kind: "global" } satisfies ProjectScopeSelection;
    if (isSameProjectScope(this.state.settings.selectedProjectScope, normalizedScope)) {
      return;
    }

    this.state.settings.selectedProjectScope = normalizedScope;
    this.persistSettings();
    const scopeTitle = normalizedScope.kind === "global"
      ? localize("project_scope.global", this.desktopLanguage)
      : this.state.settings.recentProjectScopes.find((item) => item.projectId === normalizedScope.projectId)?.title
        ?? normalizedScope.projectId;
    this.state.view.toastMessage = localize("toast.project_scope.switched", this.desktopLanguage)
      .replace("%@", scopeTitle);
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

  async openCardRepository(url: string): Promise<void> {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }
    await this.openExternalUrl(normalizedUrl);
  }

  async openCardPath(path: string): Promise<void> {
    const normalizedPath = path.trim();
    if (!normalizedPath) {
      return;
    }
    await this.openPath(normalizedPath);
  }

  selectHomeTagFilter(tagId?: string): void {
    this.groupTags.setSelectedHomeTagFilter(tagId);
  }

  addCustomTag(sourceId: string, rawTitle: string, accent: DesktopAccentColor = this.themeAccent): void {
    this.groupTags.addCustomTag(sourceId, rawTitle, accent);
  }

  removeCustomTag(sourceId: string, tagId: string): void {
    this.groupTags.removeCustomTag(sourceId, tagId);
  }

  async deleteSource(sourceId: string): Promise<void> {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      this.state.view.toastMessage = localize("toast.uninstall.no_group_selected", this.desktopLanguage);
      this.onChange();
      return;
    }

    try {
      await this.mutationCoordinator.run(() => this.deleteSourceCommand(normalizedSourceId));
      this.removeSourceFromState(normalizedSourceId);
      await this.refreshList();
      this.reconcileSelectedSource();
      if (this.state.view.currentRoute.kind === "detail" && this.state.view.currentRoute.sourceId === normalizedSourceId) {
        this.state.view.currentRoute = { kind: "home" };
      }
      this.state.view.toastMessage = localize("toast.uninstall.success", this.desktopLanguage).replace("%@", normalizedSourceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.view.toastMessage = localize("toast.uninstall.failed", this.desktopLanguage).replace("%@", message);
    }
    this.onChange();
  }

  async toggleCardSkill(sourceId: string, skillId: string): Promise<void> {
    await this.updateCardSelection(sourceId, (card) => {
      card.skills = (card.skills ?? []).map((skill) =>
        skill.id === skillId ? { ...skill, isEnabled: !skill.isEnabled } : skill,
      );
    });
  }

  async toggleAllCardSkills(sourceId: string): Promise<void> {
    await this.updateCardSelection(sourceId, (card) => {
      const skills = card.skills ?? [];
      const shouldEnable = skills.some((skill) => !skill.isEnabled);
      card.skills = skills.map((skill) => ({ ...skill, isEnabled: shouldEnable }));
    });
  }

  async toggleCardTarget(sourceId: string, targetId: string): Promise<void> {
    await this.updateCardSelection(sourceId, (card) => {
      card.targets = (card.targets ?? []).map((target) =>
        target.id === targetId ? { ...target, isEnabled: !target.isEnabled } : target,
      );
    });
  }

  async toggleAllCardTargets(sourceId: string): Promise<void> {
    await this.updateCardSelection(sourceId, (card) => {
      const targets = card.targets ?? [];
      const shouldEnable = targets.some((target) => !target.isEnabled);
      card.targets = targets.map((target) => ({ ...target, isEnabled: shouldEnable }));
    });
  }

  inventoryTags(sourceId: string): WorkspaceTagPreference[] {
    return this.groupTags.inventoryTags(sourceId);
  }

  tagSuggestions(sourceId: string): WorkspaceTagPreference[] {
    return this.groupTags.tagSuggestions(sourceId, this.sourceIds);
  }

  canCreateGroupTag(sourceId: string): boolean {
    return this.groupTags.canCreateGroupTag(sourceId);
  }

  canDeleteGroupTags(sourceId: string): boolean {
    return this.groupTags.canDeleteGroupTags(sourceId);
  }

  private async runWithToast(action: () => Promise<void>): Promise<void> {
    try {
      this.state.view.toastMessage = undefined;
      await action();
    } catch (error) {
      this.state.view.toastMessage =
        error instanceof Error
          ? error.message
          : localize("error.operation_failed", this.desktopLanguage);
      this.onChange();
    }
  }

  private formatUpdateSummaryToast(value: unknown, fallbackCount: number): string {
    const items = updateSummaryItems(value);
    if (items.length === 0) {
      const key = fallbackCount === 1 ? "toast.update.summary.single" : "toast.update.summary.multiple";
      return localize(key, this.desktopLanguage).replace("%@", String(fallbackCount));
    }

    let changedCount = 0;
    let upToDateCount = 0;
    let reviewCount = 0;

    for (const item of items) {
      const invalidatedLeafCount = stringArrayLength(item.invalidatedLeafIds);
      const addedLeafCount = stringArrayLength(item.addedLeafIds);
      const removedLeafCount = stringArrayLength(item.removedLeafIds);
      if (invalidatedLeafCount > 0) {
        reviewCount += 1;
      } else if (item.changed === true || addedLeafCount > 0 || removedLeafCount > 0) {
        changedCount += 1;
      } else {
        upToDateCount += 1;
      }
    }

    const parts = [
      changedCount > 0
        ? localize("toast.update.summary.updated_count", this.desktopLanguage).replace("%@", String(changedCount))
        : undefined,
      upToDateCount > 0
        ? localize("toast.update.summary.up_to_date_count", this.desktopLanguage).replace("%@", String(upToDateCount))
        : undefined,
      reviewCount > 0
        ? localize("toast.update.summary.needs_review_count", this.desktopLanguage).replace("%@", String(reviewCount))
        : undefined,
    ].filter((part): part is string => typeof part === "string");

    if (parts.length === 0) {
      const key = items.length === 1 ? "toast.update.summary.single" : "toast.update.summary.multiple";
      return localize(key, this.desktopLanguage).replace("%@", String(items.length));
    }

    return parts.join(" · ");
  }

  private reconcileSelectedSource(): void {
    const selectedSourceId = this.state.view.selectedSourceId?.trim();
    if (selectedSourceId && this.state.workspace.sourceIds.includes(selectedSourceId)) {
      this.state.view.selectedSourceId = selectedSourceId;
      return;
    }

    this.state.view.selectedSourceId = this.state.workspace.sourceIds[0];
  }

  private removeSourceFromState(sourceId: string): void {
    const removedDetail = this.state.detailState.detailsBySourceId[sourceId];
    this.state.workspace.sourceIds = this.state.workspace.sourceIds.filter((candidate) => candidate !== sourceId);
    this.state.workspace.inventorySummaries = this.state.workspace.inventorySummaries.filter((summary) => summary.sourceId !== sourceId);
    this.state.workspace.pinnedSourceIds = this.state.workspace.pinnedSourceIds.filter((candidate) => candidate !== sourceId);
    delete this.state.workspace.customTagsBySourceId[sourceId];
    delete this.state.detailState.detailsBySourceId[sourceId];
    delete this.state.detailState.ui.selectedSkillIdByGroup[sourceId];
    delete this.state.detailState.ui.showsGroupOverviewByGroup[sourceId];
    delete this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
    delete this.state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId];
    delete this.state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId];
    for (const skill of removedDetail?.skills ?? []) {
      delete this.state.detailState.ui.selectedSkillDocumentIdBySkill[skill.id];
    }
    if (this.state.view.selectedSourceId === sourceId) {
      this.state.view.selectedSourceId = undefined;
    }
  }

  private async updateCardSelection(
    sourceId: string,
    applyLocalChange: (card: InventorySummaryState) => void,
  ): Promise<void> {
    const normalizedSourceId = sourceId.trim();
    const card = this.state.workspace.inventorySummaries.find((summary) => summary.sourceId === normalizedSourceId);
    if (!card || !(card.skills?.length || card.targets?.length)) {
      return;
    }

    const previousCard = cloneInventoryCard(card);
    const previousDetail = this.state.detailState.detailsBySourceId[normalizedSourceId]
      ? structuredClone(this.state.detailState.detailsBySourceId[normalizedSourceId])
      : undefined;

    try {
      this.state.view.toastMessage = undefined;
      applyLocalChange(card);
      reconcileCardSelection(card);
      this.reconcileDetailFromCard(normalizedSourceId, card);
      await this.mutationCoordinator.run(() =>
        this.updateSelection(normalizedSourceId, {
          selectedSkillIds: (card.skills ?? []).filter((skill) => skill.isEnabled).map((skill) => skill.id),
          enabledTargetIds: (card.targets ?? []).filter((target) => target.isEnabled).map((target) => target.id),
        }),
      );
    } catch (error) {
      Object.assign(card, previousCard);
      if (previousDetail) {
        this.state.detailState.detailsBySourceId[normalizedSourceId] = previousDetail;
      }
      this.state.view.toastMessage =
        error instanceof Error
          ? error.message
          : localize("error.selection_update_failed", this.desktopLanguage);
    }
    this.onChange();
  }

  private reconcileDetailFromCard(sourceId: string, card: InventorySummaryState): void {
    const detail = this.state.detailState.detailsBySourceId[sourceId];
    if (!detail) {
      return;
    }

    const skillsById = new Map((card.skills ?? []).map((skill) => [skill.id, skill]));
    const targetsById = new Map((card.targets ?? []).map((target) => [target.id, target]));
    detail.skills = detail.skills.map((skill) => {
      const cardSkill = skillsById.get(skill.id);
      return cardSkill ? { ...skill, isEnabled: cardSkill.isEnabled } : skill;
    });
    detail.targets = detail.targets.map((target) => {
      const cardTarget = targetsById.get(target.id);
      return cardTarget ? { ...target, isEnabled: cardTarget.isEnabled } : target;
    });
    detail.enabledTargetLabels = detail.targets
      .filter((target) => target.isEnabled)
      .map((target) => target.label ?? target.id);
    detail.enabledSkillCount = detail.skills.filter((skill) => skill.isEnabled).length;
    detail.enabledTargetCount = detail.targets.filter((target) => target.isEnabled).length;
    detail.skillSelection = selectionState(detail.enabledSkillCount, detail.skills.length);
    detail.targetSelection = selectionState(detail.enabledTargetCount, detail.targets.length);
  }

  private matchesCardSearch(card: InventorySummaryState, rawQuery: string): boolean {
    const query = rawQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      card.sourceId,
      card.title,
      card.locator,
      card.byline,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .some((value) => value.toLowerCase().includes(query));
  }

  private matchesSelectedTag(sourceId: string): boolean {
    const selectedTagId = this.state.workspace.selectedHomeTagFilterId;
    if (!selectedTagId) {
      return true;
    }
    return this.inventoryTags(sourceId).some((tag) => tag.id === selectedTagId);
  }
}

type UpdateSummaryItem = Record<string, unknown> & {
  changed?: boolean;
  invalidatedLeafIds?: unknown;
  addedLeafIds?: unknown;
  removedLeafIds?: unknown;
};

function mergeUpdateResults(results: unknown[]): unknown {
  const updated = results.flatMap((result) => updateSummaryItems(result));
  return updated.length > 0 ? { updated } : undefined;
}

function updateSummaryItems(value: unknown): UpdateSummaryItem[] {
  if (!isRecord(value) || !Array.isArray(value.updated)) {
    return [];
  }
  return value.updated.filter(isRecord);
}

function stringArrayLength(value: unknown): number {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").length
    : 0;
}

function cloneInventoryCard(card: InventorySummaryState): InventorySummaryState {
  return {
    ...card,
    ...(card.enabledTargetLabels ? { enabledTargetLabels: [...card.enabledTargetLabels] } : {}),
    ...(card.selectedSkillNames ? { selectedSkillNames: [...card.selectedSkillNames] } : {}),
    ...(card.skills ? { skills: card.skills.map((skill) => ({ ...skill })) } : {}),
    ...(card.targets ? { targets: card.targets.map((target) => ({ ...target })) } : {}),
  };
}

function reconcileCardSelection(card: InventorySummaryState): void {
  const enabledSkills = card.skills?.filter((skill) => skill.isEnabled) ?? [];
  const enabledTargets = card.targets?.filter((target) => target.isEnabled) ?? [];
  card.enabledSkillCount = enabledSkills.length;
  card.activeTargetCount = enabledTargets.length;
  card.selectedSkillNames = enabledSkills.map((skill) => skill.title);
  card.enabledTargetLabels = enabledTargets.map((target) => target.label);
  card.skillSelection = selectionState(enabledSkills.length, card.skills?.length ?? card.skillCount);
  card.targetSelection = selectionState(enabledTargets.length, card.targets?.length ?? 0);
}

function selectionState(enabledCount: number, totalCount: number): InventorySelectionState {
  if (totalCount === 0 || enabledCount === 0) {
    return "empty";
  }
  return enabledCount >= totalCount ? "full" : "partial";
}

function isSameProjectScope(left: ProjectScopeSelection, right: ProjectScopeSelection): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  return left.kind === "global" || left.projectId === (right as { kind: "project"; projectId: string }).projectId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";
import { localize } from "../i18n";
import type { DesktopGroupTagStore } from "../runtime/group-tag-store";
import {
  createPassthroughMutationCoordinator,
  type MutationCoordinator,
} from "../runtime/mutation-coordinator";
import type { DesktopAppState } from "../store/desktop-app-state";
import type {
  DetailDocumentTab,
  DetailFileTreeItem,
  DetailRecord,
  DetailSelectionState,
} from "../store/detail-state";
import type { InventorySummaryState, WorkspaceTagPreference } from "../store/workspace-state";
import type { DesktopAccentColor, DesktopThemeMode } from "../theme/app-theme";
import { GroupTagController } from "./group-tag-controller";

const DETAIL_SKILL_SELECTION_DELAY_MS = 80;
const DETAIL_DOCUMENT_SELECTION_DELAY_MS = 40;

export class DetailViewModel {
  private readonly onChange: () => void;
  private readonly updateSelection: (
    sourceId: string,
    draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
  ) => Promise<void>;
  private readonly updateGroup: (sourceId: string) => Promise<void>;
  private readonly isUpdatingSource: (sourceId: string) => boolean;
  private readonly openExternalUrl: (url: string) => Promise<void>;
  private readonly openPath: (path: string) => Promise<void>;
  private readonly mutationCoordinator: MutationCoordinator;
  private readonly groupTags: GroupTagController;

  constructor(
    private readonly state: DesktopAppState,
    options: {
      onChange?: () => void;
      updateSelection?: (
        sourceId: string,
        draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
      ) => Promise<void>;
      updateGroup?: (sourceId: string) => Promise<void>;
      isUpdatingSource?: (sourceId: string) => boolean;
      openExternalUrl?: (url: string) => Promise<void>;
      openPath?: (path: string) => Promise<void>;
      mutationCoordinator?: MutationCoordinator;
      groupTagStore?: Pick<DesktopGroupTagStore, "loadCustomTags" | "saveCustomTags">;
    } = {},
  ) {
    this.onChange = options.onChange ?? (() => undefined);
    this.updateSelection = options.updateSelection ?? (async () => undefined);
    this.updateGroup = options.updateGroup ?? (async () => undefined);
    this.isUpdatingSource = options.isUpdatingSource ?? (() => false);
    this.openExternalUrl = options.openExternalUrl ?? (async () => undefined);
    this.openPath = options.openPath ?? (async () => undefined);
    this.mutationCoordinator =
      options.mutationCoordinator ?? createPassthroughMutationCoordinator();
    this.groupTags = new GroupTagController(this.state, {
      ...(options.groupTagStore ? { groupTagStore: options.groupTagStore } : {}),
      language: () => this.desktopLanguage,
      onChange: this.onChange,
    });
  }

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get sourceId(): string | undefined {
    if (this.state.view.currentRoute.kind === "detail") {
      return this.state.view.currentRoute.sourceId;
    }
    return this.state.view.selectedSourceId;
  }

  get detail(): DetailRecord | undefined {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return undefined;
    }
    return this.state.detailState.detailsBySourceId[sourceId];
  }

  get presentedDetail(): DetailRecord | undefined {
    return this.detail ?? this.fallbackDetail;
  }

  get isDetailLoading(): boolean {
    return this.sourceId !== undefined && this.detail === undefined;
  }

  private get fallbackDetail(): DetailRecord | undefined {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return undefined;
    }
    const summary = this.state.workspace.inventorySummaries.find((item) => item.sourceId === sourceId);
    return summary ? detailFromInventorySummary(summary) : detailFromSourceId(sourceId);
  }

  get showingGroupOverview(): boolean {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return true;
    }
    return this.state.detailState.ui.showsGroupOverviewByGroup[sourceId] ?? true;
  }

  get toastMessage(): string | undefined {
    return this.state.view.toastMessage;
  }

  get desktopLanguage(): string {
    return this.state.settings.desktopLanguageRawValue;
  }

  get themeAccent(): DesktopAccentColor {
    return this.state.settings.themeAccentRawValue as DesktopAccentColor;
  }

  get themeMode(): DesktopThemeMode {
    return this.state.settings.themeModeRawValue as DesktopThemeMode;
  }

  get selectedSkillId(): string | undefined {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail) {
      return undefined;
    }
    const pending = this.state.detailState.ui.pendingSkillIdByGroup[sourceId];
    if (pending && detail.skills.some((skill) => skill.id === pending)) {
      return pending;
    }
    const stored = this.state.detailState.ui.selectedSkillIdByGroup[sourceId];
    if (stored) {
      return stored;
    }
    return detail.skills.find((skill) => skill.isEnabled)?.id ?? detail.skills[0]?.id;
  }

  get selectedTreeItemId(): string | undefined {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail) {
      return undefined;
    }

    const stored = this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
    if (stored) {
      return stored;
    }
    if (this.showingGroupOverview) {
      return undefined;
    }

    return findSkillRootId(detail.fileTree, this.selectedSkillId);
  }

  get selectedGroupDocument(): DetailDocumentTab | undefined {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail) {
      return undefined;
    }

    const pendingId = this.state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId];
    const selectedId = pendingId ?? this.state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId];
    return detail.groupDocuments.find((document) => document.id === selectedId) ?? detail.groupDocuments[0];
  }

  get selectedSkillDocument(): DetailDocumentTab | undefined {
    const detail = this.detail;
    const selectedSkillId = this.selectedSkillId;
    if (!detail || !selectedSkillId) {
      return undefined;
    }

    const skill = detail.skills.find((candidate) => candidate.id === selectedSkillId);
    if (!skill) {
      return undefined;
    }
    const pendingId = this.state.detailState.ui.pendingSkillDocumentIdBySkill[selectedSkillId];
    const selectedId = pendingId ?? this.state.detailState.ui.selectedSkillDocumentIdBySkill[selectedSkillId];
    return skill.documents.find((document) => document.id === selectedId) ?? skill.documents[0];
  }

  get isGroupDocumentLoading(): boolean {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail || !this.showingGroupOverview) {
      return false;
    }
    const pending = this.state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId];
    return Boolean(pending && detail.groupDocuments.some((document) => document.id === pending));
  }

  get isSkillDocumentLoading(): boolean {
    const detail = this.detail;
    const selectedSkillId = this.selectedSkillId;
    if (!detail || !selectedSkillId || this.showingGroupOverview) {
      return false;
    }
    const skill = detail.skills.find((candidate) => candidate.id === selectedSkillId);
    const pending = this.state.detailState.ui.pendingSkillDocumentIdBySkill[selectedSkillId];
    return Boolean(pending && skill?.documents.some((document) => document.id === pending));
  }

  get isSkillContentLoading(): boolean {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail || this.showingGroupOverview) {
      return false;
    }
    const pending = this.state.detailState.ui.pendingSkillIdByGroup[sourceId];
    return Boolean(pending && detail.skills.some((skill) => skill.id === pending));
  }

  isPendingSkill(skillId: string): boolean {
    const sourceId = this.sourceId;
    return Boolean(sourceId && this.state.detailState.ui.pendingSkillIdByGroup[sourceId] === skillId);
  }

  get isUpdatingCurrentGroup(): boolean {
    const sourceId = this.sourceId;
    return sourceId ? this.isUpdatingSource(sourceId) : false;
  }

  showSource(sourceId: string) {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      return;
    }
    this.state.view.selectedSourceId = normalizedSourceId;
    this.state.view.currentRoute = desktopRoute.detail(normalizedSourceId);
    this.onChange();
  }

  showHome(): void {
    this.state.view.currentRoute = desktopRoute.home();
    this.onChange();
  }

  hydrateInspect(sourceId: string, detail: DetailRecord): void {
    this.state.detailState.detailsBySourceId[sourceId] = detail;
    seedDetailUiSelectionState(this.state, sourceId, detail);
    this.onChange();
  }

  hydrateEnrichment(sourceId: string, enrichment: Partial<DetailRecord>): void {
    const existing = this.state.detailState.detailsBySourceId[sourceId];
    if (!existing) {
      return;
    }
    this.state.detailState.detailsBySourceId[sourceId] = {
      ...existing,
      ...enrichment,
    };
    this.onChange();
  }

  selectSkill(skillId: string): void {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail || !detail.skills.some((skill) => skill.id === skillId)) {
      return;
    }
    const currentId = this.state.detailState.ui.selectedSkillIdByGroup[sourceId];
    const pendingId = this.state.detailState.ui.pendingSkillIdByGroup[sourceId];
    if (currentId === skillId && pendingId === undefined && !this.showingGroupOverview) {
      return;
    }
    this.state.detailState.ui.showsGroupOverviewByGroup[sourceId] = false;
    this.state.detailState.ui.pendingSkillIdByGroup[sourceId] = skillId;
    const token = (this.state.detailState.ui.skillSelectionTokenByGroup[sourceId] ?? 0) + 1;
    this.state.detailState.ui.skillSelectionTokenByGroup[sourceId] = token;
    const fallbackTreeItemId = findSkillRootId(this.detail?.fileTree ?? [], skillId);
    if (fallbackTreeItemId) {
      this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId] = fallbackTreeItemId;
      this.expandTreePath(sourceId, fallbackTreeItemId);
    }
    this.onChange();
    setTimeout(() => {
      if (this.state.detailState.ui.skillSelectionTokenByGroup[sourceId] !== token) {
        return;
      }
      if (this.state.detailState.ui.pendingSkillIdByGroup[sourceId] !== skillId) {
        return;
      }
      this.state.detailState.ui.selectedSkillIdByGroup[sourceId] = skillId;
      delete this.state.detailState.ui.pendingSkillIdByGroup[sourceId];
      this.onChange();
    }, DETAIL_SKILL_SELECTION_DELAY_MS);
  }

  showOverview(): void {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }
    this.state.detailState.ui.showsGroupOverviewByGroup[sourceId] = true;
    delete this.state.detailState.ui.pendingSkillIdByGroup[sourceId];
    this.state.detailState.ui.skillSelectionTokenByGroup[sourceId] =
      (this.state.detailState.ui.skillSelectionTokenByGroup[sourceId] ?? 0) + 1;
    delete this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
    this.onChange();
  }

  selectTreeItem(itemId: string): void {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }
    const item = findTreeItem(this.detail?.fileTree ?? [], itemId);
    if (!item) {
      return;
    }

    this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId] = itemId;
    if (item.skillId && (item.isSkillRoot || item.isSkillDocument)) {
      this.state.detailState.ui.showsGroupOverviewByGroup[sourceId] = false;
      this.expandTreePath(sourceId, itemId);
      this.selectSkill(item.skillId);
      return;
    }

    if (item.isDirectory) {
      this.toggleTreeItemCollapsed(sourceId, itemId);
    }
    this.onChange();
  }

  isTreeItemExpanded(itemId: string): boolean {
    const sourceId = this.sourceId;
    const item = findTreeItem(this.detail?.fileTree ?? [], itemId);
    if (!sourceId || !item?.isDirectory) {
      return false;
    }
    return !(this.state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] ?? []).includes(itemId);
  }

  selectGroupDocument(documentId: string): void {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail || !detail.groupDocuments.some((document) => document.id === documentId)) {
      return;
    }
    const currentId = this.state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId];
    const pendingId = this.state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId];
    if (currentId === documentId && pendingId === undefined) {
      return;
    }
    this.state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId] = documentId;
    const token = (this.state.detailState.ui.groupDocumentSelectionTokenByGroup[sourceId] ?? 0) + 1;
    this.state.detailState.ui.groupDocumentSelectionTokenByGroup[sourceId] = token;
    this.onChange();
    setTimeout(() => {
      if (this.state.detailState.ui.groupDocumentSelectionTokenByGroup[sourceId] !== token) {
        return;
      }
      if (this.state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId] !== documentId) {
        return;
      }
      this.state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId] = documentId;
      delete this.state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId];
      this.onChange();
    }, DETAIL_DOCUMENT_SELECTION_DELAY_MS);
  }

  selectSkillDocument(skillId: string, documentId: string): void {
    const detail = this.detail;
    const skill = detail?.skills.find((candidate) => candidate.id === skillId);
    if (!skill?.documents.some((document) => document.id === documentId)) {
      return;
    }
    const currentId = this.state.detailState.ui.selectedSkillDocumentIdBySkill[skillId];
    const pendingId = this.state.detailState.ui.pendingSkillDocumentIdBySkill[skillId];
    if (currentId === documentId && pendingId === undefined) {
      return;
    }
    this.state.detailState.ui.pendingSkillDocumentIdBySkill[skillId] = documentId;
    const token = (this.state.detailState.ui.skillDocumentSelectionTokenBySkill[skillId] ?? 0) + 1;
    this.state.detailState.ui.skillDocumentSelectionTokenBySkill[skillId] = token;
    this.onChange();
    setTimeout(() => {
      if (this.state.detailState.ui.skillDocumentSelectionTokenBySkill[skillId] !== token) {
        return;
      }
      if (this.state.detailState.ui.pendingSkillDocumentIdBySkill[skillId] !== documentId) {
        return;
      }
      this.state.detailState.ui.selectedSkillDocumentIdBySkill[skillId] = documentId;
      delete this.state.detailState.ui.pendingSkillDocumentIdBySkill[skillId];
      this.onChange();
    }, DETAIL_DOCUMENT_SELECTION_DELAY_MS);
  }

  groupTagItems(sourceId: string): WorkspaceTagPreference[] {
    return this.groupTags.inventoryTags(sourceId);
  }

  groupTagSuggestions(sourceId: string): WorkspaceTagPreference[] {
    return this.groupTags.tagSuggestions(sourceId);
  }

  canCreateGroupTag(sourceId: string): boolean {
    return this.groupTags.canCreateGroupTag(sourceId);
  }

  canDeleteGroupTags(sourceId: string): boolean {
    return this.groupTags.canDeleteGroupTags(sourceId);
  }

  addCustomTag(sourceId: string, title: string, accent: DesktopAccentColor = this.themeAccent): void {
    this.groupTags.addCustomTag(sourceId, title, accent);
  }

  removeCustomTag(sourceId: string, tagId: string): void {
    this.groupTags.removeCustomTag(sourceId, tagId);
  }

  async updateCurrentGroup(): Promise<void> {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }
    this.state.view.selectedSourceId = sourceId;
    await this.updateGroup(sourceId);
    this.onChange();
  }

  async openRepository(): Promise<void> {
    const repoUrl = this.detail?.repoUrl;
    if (!repoUrl) {
      return;
    }
    await this.openExternalUrl(repoUrl);
  }

  async openGroupPath(): Promise<void> {
    const groupPath = this.detail?.groupPath;
    if (!groupPath) {
      return;
    }
    await this.openPath(groupPath);
  }

  async openDocumentUrl(url: string): Promise<void> {
    const normalizedUrl = url.trim();
    if (!normalizedUrl || normalizedUrl === "#") {
      return;
    }
    await this.openExternalUrl(normalizedUrl);
  }

  async openDocumentPath(path: string): Promise<void> {
    const normalizedPath = path.trim();
    if (!normalizedPath) {
      return;
    }
    await this.openPath(normalizedPath);
  }

  async toggleTarget(targetId: string): Promise<void> {
    const detail = this.detail;
    const sourceId = this.sourceId;
    if (!detail || !sourceId) {
      return;
    }

    await this.runSelectionMutation(detail, () => {
      detail.targets = detail.targets.map((target) =>
        target.id === targetId ? { ...target, isEnabled: !target.isEnabled } : target,
      );
      detail.enabledTargetLabels = detail.targets
        .filter((target) => target.isEnabled)
        .map((target) => target.label ?? target.id);
    });
  }

  async toggleAllTargets(): Promise<void> {
    const detail = this.detail;
    const sourceId = this.sourceId;
    if (!detail || !sourceId) {
      return;
    }

    await this.runSelectionMutation(detail, () => {
      const shouldEnable = detail.targets.some((target) => !target.isEnabled);
      detail.targets = detail.targets.map((target) => ({ ...target, isEnabled: shouldEnable }));
      detail.enabledTargetLabels = detail.targets
        .filter((target) => target.isEnabled)
        .map((target) => target.label ?? target.id);
    });
  }

  async toggleSkill(skillId: string): Promise<void> {
    const detail = this.detail;
    const sourceId = this.sourceId;
    if (!detail || !sourceId) {
      return;
    }

    await this.runSelectionMutation(detail, () => {
      detail.skills = detail.skills.map((skill) =>
        skill.id === skillId ? { ...skill, isEnabled: !skill.isEnabled } : skill,
      );
    });
  }

  async toggleAllSkills(): Promise<void> {
    const detail = this.detail;
    const sourceId = this.sourceId;
    if (!detail || !sourceId) {
      return;
    }

    await this.runSelectionMutation(detail, () => {
      const shouldEnable = detail.skills.some((skill) => !skill.isEnabled);
      detail.skills = detail.skills.map((skill) => ({ ...skill, isEnabled: shouldEnable }));
    });
  }

  private async runSelectionMutation(
    detail: DetailRecord,
    applyLocalChange: () => void,
  ): Promise<void> {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }

    const previousSkills = detail.skills;
    const previousTargets = detail.targets;
    const previousLabels = detail.enabledTargetLabels;
    const previousSummary = detailSelectionSummary(detail);

    try {
      this.state.view.toastMessage = undefined;
      applyLocalChange();
      applyDetailSelectionSummary(detail);
      await this.mutationCoordinator.run(() =>
        this.updateSelection(sourceId, {
          selectedSkillIds: detail.skills.filter((skill) => skill.isEnabled).map((skill) => skill.id),
          enabledTargetIds: detail.targets.filter((target) => target.isEnabled).map((target) => target.id),
        }),
      );
    } catch (error) {
      detail.skills = previousSkills;
      detail.targets = previousTargets;
      detail.enabledTargetLabels = previousLabels;
      detail.skillSelection = previousSummary.skillSelection;
      detail.targetSelection = previousSummary.targetSelection;
      restoreOptionalNumber(detail, "enabledSkillCount", previousSummary.enabledSkillCount);
      restoreOptionalNumber(detail, "enabledTargetCount", previousSummary.enabledTargetCount);
      this.state.view.toastMessage =
        error instanceof Error
          ? error.message
          : localize("error.selection_update_failed", this.desktopLanguage);
    }
    this.onChange();
  }

  private toggleTreeItemCollapsed(sourceId: string, itemId: string): void {
    const collapsedIds = new Set(this.state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] ?? []);
    if (collapsedIds.has(itemId)) {
      collapsedIds.delete(itemId);
    } else {
      collapsedIds.add(itemId);
    }
    this.state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] = [...collapsedIds];
  }

  private expandTreePath(sourceId: string, itemId: string): void {
    const detail = this.detail;
    if (!detail) {
      return;
    }
    const pathIds = findTreePathIds(detail.fileTree, itemId);
    if (!pathIds) {
      return;
    }
    const collapsedIds = new Set(this.state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] ?? []);
    for (const pathId of pathIds) {
      collapsedIds.delete(pathId);
    }
    this.state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] = [...collapsedIds];
  }
}

function detailSelectionSummary(detail: DetailRecord): {
  skillSelection: DetailSelectionState;
  targetSelection: DetailSelectionState;
  enabledSkillCount: number | undefined;
  enabledTargetCount: number | undefined;
} {
  return {
    skillSelection: detail.skillSelection,
    targetSelection: detail.targetSelection,
    enabledSkillCount: detail.enabledSkillCount,
    enabledTargetCount: detail.enabledTargetCount,
  };
}

function applyDetailSelectionSummary(detail: DetailRecord): void {
  const enabledSkillCount = detail.skills.filter((skill) => skill.isEnabled).length;
  const enabledTargetCount = detail.targets.filter((target) => target.isEnabled).length;
  detail.enabledSkillCount = enabledSkillCount;
  detail.enabledTargetCount = enabledTargetCount;
  detail.skillSelection = selectionState(enabledSkillCount, detail.skills.length);
  detail.targetSelection = selectionState(enabledTargetCount, detail.targets.length);
}

function selectionState(enabledCount: number, totalCount: number): DetailSelectionState {
  if (totalCount === 0 || enabledCount === 0) {
    return "empty";
  }
  return enabledCount >= totalCount ? "full" : "partial";
}

function restoreOptionalNumber(
  detail: DetailRecord,
  key: "enabledSkillCount" | "enabledTargetCount",
  value: number | undefined,
): void {
  if (value === undefined) {
    delete detail[key];
    return;
  }
  detail[key] = value;
}

function detailFromInventorySummary(summary: InventorySummaryState): DetailRecord {
  const author = authorFromByline(summary.byline);
  return {
    sourceId: summary.sourceId,
    title: summary.title,
    locator: summary.locator,
    enabledSkillCount: summary.enabledSkillCount,
    totalSkillCount: summary.skillCount,
    enabledTargetCount: summary.activeTargetCount,
    enabledTargetLabels: summary.enabledTargetLabels ?? [],
    fileTree: [],
    groupDocuments: [],
    targets: summary.targets ?? [],
    skills: (summary.skills ?? []).map((skill) => ({
      id: skill.id,
      title: skill.title,
      isEnabled: skill.isEnabled,
      documents: [],
    })),
    sourceFacts: [],
    deploymentFacts: [],
    skillSelection: summary.skillSelection ?? selectionState(summary.enabledSkillCount, summary.skillCount),
    targetSelection: summary.targetSelection ?? selectionState(summary.activeTargetCount, summary.targets?.length ?? 0),
    ...(author ? { author } : {}),
    ...(summary.downloadCount !== undefined ? { downloadCount: summary.downloadCount } : {}),
    ...(summary.starCount !== undefined ? { starCount: summary.starCount } : {}),
    ...(summary.repoUrl ? { repoUrl: summary.repoUrl } : {}),
    ...(summary.groupPath ? { groupPath: summary.groupPath } : {}),
  };
}

function detailFromSourceId(sourceId: string): DetailRecord {
  return {
    sourceId,
    title: sourceId,
    locator: sourceId,
    enabledTargetLabels: [],
    fileTree: [],
    groupDocuments: [],
    targets: [],
    skills: [],
    sourceFacts: [],
    deploymentFacts: [],
    skillSelection: "empty",
    targetSelection: "empty",
  };
}

function authorFromByline(byline: string | undefined): string | undefined {
  if (!byline) {
    return undefined;
  }
  const normalized = byline.trim();
  return normalized.toLowerCase().startsWith("by ") ? normalized.slice(3).trim() : normalized;
}

export function seedDetailUiSelectionState(
  state: DesktopAppState,
  sourceId: string,
  detail: DetailRecord,
): void {
  const defaultSkillId = detail.skills.find((skill) => skill.isEnabled)?.id ?? detail.skills[0]?.id;
  const pendingSkillId = state.detailState.ui.pendingSkillIdByGroup[sourceId];
  if (pendingSkillId && !detail.skills.some((skill) => skill.id === pendingSkillId)) {
    delete state.detailState.ui.pendingSkillIdByGroup[sourceId];
  }

  const currentSkillId = state.detailState.ui.selectedSkillIdByGroup[sourceId];
  const hasCurrentSkill = currentSkillId
    ? detail.skills.some((skill) => skill.id === currentSkillId)
    : false;
  state.detailState.ui.selectedSkillIdByGroup[sourceId] = hasCurrentSkill ? currentSkillId : defaultSkillId;

  const currentGroupDocumentId = state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId];
  const hasCurrentGroupDocument = currentGroupDocumentId
    ? detail.groupDocuments.some((document) => document.id === currentGroupDocumentId)
    : false;
  state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId] = hasCurrentGroupDocument
    ? currentGroupDocumentId
    : detail.groupDocuments[0]?.id;
  const pendingGroupDocumentId = state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId];
  if (pendingGroupDocumentId && !detail.groupDocuments.some((document) => document.id === pendingGroupDocumentId)) {
    delete state.detailState.ui.pendingGroupDocumentIdByGroup[sourceId];
  }

  const selectedSkillId = state.detailState.ui.selectedSkillIdByGroup[sourceId];
  if (selectedSkillId) {
    const selectedSkill = detail.skills.find((skill) => skill.id === selectedSkillId);
    const currentSkillDocumentId = state.detailState.ui.selectedSkillDocumentIdBySkill[selectedSkillId];
    const hasCurrentSkillDocument = currentSkillDocumentId
      ? selectedSkill?.documents.some((document) => document.id === currentSkillDocumentId)
      : false;
    state.detailState.ui.selectedSkillDocumentIdBySkill[selectedSkillId] = hasCurrentSkillDocument
      ? currentSkillDocumentId
      : selectedSkill?.documents[0]?.id;
    const pendingSkillDocumentId = state.detailState.ui.pendingSkillDocumentIdBySkill[selectedSkillId];
    if (pendingSkillDocumentId && !selectedSkill?.documents.some((document) => document.id === pendingSkillDocumentId)) {
      delete state.detailState.ui.pendingSkillDocumentIdBySkill[selectedSkillId];
    }
  }

  if (state.detailState.ui.showsGroupOverviewByGroup[sourceId] === undefined) {
    state.detailState.ui.showsGroupOverviewByGroup[sourceId] = true;
  }

  const currentTreeItemId = state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
  if (currentTreeItemId && !findTreeItem(detail.fileTree, currentTreeItemId)) {
    delete state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
  }

  const collapsedIds = state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] ?? [];
  state.detailState.ui.collapsedTreeItemIdsByGroup[sourceId] = collapsedIds.filter((itemId) => {
    const item = findTreeItem(detail.fileTree, itemId);
    return Boolean(item?.isDirectory);
  });
}

function findSkillRootId(
  items: DetailFileTreeItem[],
  skillId: string | undefined,
): string | undefined {
  if (!skillId) {
    return undefined;
  }

  for (const item of items) {
    if (item.skillId === skillId && item.isSkillRoot) {
      return item.id;
    }
    const childMatch = findSkillRootId(item.children, skillId);
    if (childMatch) {
      return childMatch;
    }
  }
  return undefined;
}

function findTreeItem(
  items: DetailFileTreeItem[],
  itemId: string,
): DetailFileTreeItem | undefined {
  for (const item of items) {
    if (item.id === itemId) {
      return item;
    }
    const childMatch = findTreeItem(item.children, itemId);
    if (childMatch) {
      return childMatch;
    }
  }

  return undefined;
}

function findTreePathIds(
  items: DetailFileTreeItem[],
  itemId: string,
  ancestors: string[] = [],
): string[] | undefined {
  for (const item of items) {
    const nextPath = [...ancestors, item.id];
    if (item.id === itemId) {
      return nextPath;
    }
    const childMatch = findTreePathIds(item.children, itemId, nextPath);
    if (childMatch) {
      return childMatch;
    }
  }
  return undefined;
}

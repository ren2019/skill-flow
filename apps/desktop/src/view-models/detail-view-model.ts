import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";
import { localize } from "../i18n";
import {
  createPassthroughMutationCoordinator,
  type MutationCoordinator,
} from "../runtime/mutation-coordinator";
import type { DesktopAppState } from "../store/desktop-app-state";
import type {
  DetailDocumentTab,
  DetailFileTreeItem,
  DetailRecord,
} from "../store/detail-state";

export class DetailViewModel {
  private readonly onChange: () => void;
  private readonly updateSelection: (
    sourceId: string,
    draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
  ) => Promise<void>;
  private readonly mutationCoordinator: MutationCoordinator;

  constructor(
    private readonly state: DesktopAppState,
    options: {
      onChange?: () => void;
      updateSelection?: (
        sourceId: string,
        draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
      ) => Promise<void>;
      mutationCoordinator?: MutationCoordinator;
    } = {},
  ) {
    this.onChange = options.onChange ?? (() => undefined);
    this.updateSelection = options.updateSelection ?? (async () => undefined);
    this.mutationCoordinator =
      options.mutationCoordinator ?? createPassthroughMutationCoordinator();
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

  get selectedSkillId(): string | undefined {
    const sourceId = this.sourceId;
    const detail = this.detail;
    if (!sourceId || !detail) {
      return undefined;
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

    const selectedId = this.state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId];
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
    const selectedId = this.state.detailState.ui.selectedSkillDocumentIdBySkill[selectedSkillId];
    return skill.documents.find((document) => document.id === selectedId) ?? skill.documents[0];
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
    if (!sourceId) {
      return;
    }
    this.state.detailState.ui.showsGroupOverviewByGroup[sourceId] = false;
    this.state.detailState.ui.selectedSkillIdByGroup[sourceId] = skillId;
    const fallbackTreeItemId = findSkillRootId(this.detail?.fileTree ?? [], skillId);
    if (fallbackTreeItemId) {
      this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId] = fallbackTreeItemId;
    }
    this.onChange();
  }

  showOverview(): void {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }
    this.state.detailState.ui.showsGroupOverviewByGroup[sourceId] = true;
    this.onChange();
  }

  selectTreeItem(itemId: string): void {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }
    this.state.detailState.ui.selectedTreeItemIdByGroup[sourceId] = itemId;
    this.onChange();
  }

  selectGroupDocument(documentId: string): void {
    const sourceId = this.sourceId;
    if (!sourceId) {
      return;
    }
    this.state.detailState.ui.selectedGroupDocumentIdByGroup[sourceId] = documentId;
    this.onChange();
  }

  selectSkillDocument(skillId: string, documentId: string): void {
    this.state.detailState.ui.selectedSkillDocumentIdBySkill[skillId] = documentId;
    this.onChange();
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

    try {
      this.state.view.toastMessage = undefined;
      applyLocalChange();
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
      this.state.view.toastMessage =
        error instanceof Error
          ? error.message
          : localize("error.selection_update_failed", this.desktopLanguage);
    }
    this.onChange();
  }
}

export function seedDetailUiSelectionState(
  state: DesktopAppState,
  sourceId: string,
  detail: DetailRecord,
): void {
  const defaultSkillId = detail.skills.find((skill) => skill.isEnabled)?.id ?? detail.skills[0]?.id;
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
  }

  if (state.detailState.ui.showsGroupOverviewByGroup[sourceId] === undefined) {
    state.detailState.ui.showsGroupOverviewByGroup[sourceId] = true;
  }

  const currentTreeItemId = state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
  if (currentTreeItemId && !findTreeItem(detail.fileTree, currentTreeItemId)) {
    delete state.detailState.ui.selectedTreeItemIdByGroup[sourceId];
  }
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

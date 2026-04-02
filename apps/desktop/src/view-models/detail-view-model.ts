import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";
import type { DesktopAppState } from "../store/desktop-app-state";
import type {
  DetailDocumentTab,
  DetailFileTreeItem,
  DetailRecord,
} from "../store/detail-state";

export class DetailViewModel {
  private readonly onChange: () => void;

  constructor(
    private readonly state: DesktopAppState,
    options: { onChange?: () => void } = {},
  ) {
    this.onChange = options.onChange ?? (() => undefined);
  }

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get sourceId(): string | undefined {
    if (this.state.view.selectedSourceId) {
      return this.state.view.selectedSourceId;
    }
    return this.state.view.currentRoute.kind === "detail" ? this.state.view.currentRoute.sourceId : undefined;
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

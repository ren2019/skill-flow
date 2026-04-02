export type DetailSelectionState = "empty" | "partial" | "full";

export type DetailMetadataEntry = {
  id: string;
  key: string;
  value: string;
};

export type DetailDocumentTab = {
  id: string;
  title: string;
  path: string;
  metadata: DetailMetadataEntry[];
  renderCacheKey: string;
  externalUrl?: string;
  content: string;
  isLoaded: boolean;
};

export type DetailFileTreeItem = {
  id: string;
  title: string;
  path: string;
  isDirectory: boolean;
  isSkillRoot: boolean;
  isSkillDocument: boolean;
  skillId?: string;
  children: DetailFileTreeItem[];
};

export type DetailTargetState = {
  id: string;
  label?: string;
  shortLabel?: string;
  isEnabled?: boolean;
};

export type DetailSkillState = {
  id: string;
  title: string;
  isEnabled: boolean;
  documents: DetailDocumentTab[];
};

export type DetailRecord = {
  sourceId: string;
  revision?: string;
  title: string;
  subtitle?: string;
  author?: string;
  originLabel?: string;
  starCount?: number;
  locator?: string;
  groupPath?: string;
  updatedAt?: string;
  updatedRelative?: string;
  health?: string;
  warningCount?: number;
  errorCount?: number;
  enabledSkillCount?: number;
  totalSkillCount?: number;
  enabledTargetCount?: number;
  saveState?: { phase: string; detail?: string };
  skillSelection: DetailSelectionState;
  targetSelection: DetailSelectionState;
  enabledTargetLabels: string[];
  sourceFacts: string[];
  deploymentFacts: string[];
  fileTree: DetailFileTreeItem[];
  groupDocuments: DetailDocumentTab[];
  targets: DetailTargetState[];
  skills: DetailSkillState[];
};

export type DetailUiState = {
  selectedSkillIdByGroup: Record<string, string | undefined>;
  showsGroupOverviewByGroup: Record<string, boolean | undefined>;
  selectedTreeItemIdByGroup: Record<string, string | undefined>;
  selectedGroupDocumentIdByGroup: Record<string, string | undefined>;
  selectedSkillDocumentIdBySkill: Record<string, string | undefined>;
};

export type DetailState = {
  detailsBySourceId: Record<string, DetailRecord>;
  ui: DetailUiState;
};

export function createDetailState(seed: Partial<DetailState> = {}): DetailState {
  return {
    detailsBySourceId: { ...(seed.detailsBySourceId ?? {}) },
    ui: {
      selectedSkillIdByGroup: { ...(seed.ui?.selectedSkillIdByGroup ?? {}) },
      showsGroupOverviewByGroup: { ...(seed.ui?.showsGroupOverviewByGroup ?? {}) },
      selectedTreeItemIdByGroup: { ...(seed.ui?.selectedTreeItemIdByGroup ?? {}) },
      selectedGroupDocumentIdByGroup: { ...(seed.ui?.selectedGroupDocumentIdByGroup ?? {}) },
      selectedSkillDocumentIdBySkill: { ...(seed.ui?.selectedSkillDocumentIdBySkill ?? {}) },
    },
  };
}

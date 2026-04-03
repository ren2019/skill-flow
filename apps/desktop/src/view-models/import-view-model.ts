import type { DesktopAppState } from "../store/desktop-app-state";
import { localize } from "../i18n";
import type {
  ImportDraftState,
  ImportGroupState,
  ImportSkillState,
  ImportTargetState,
} from "../store/import-state";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";
import {
  createPassthroughMutationCoordinator,
  type MutationCoordinator,
} from "../runtime/mutation-coordinator";

type ImportRecommendationSeed = {
  id: string;
  title: string;
  locator: string;
  isInstalledLocally?: boolean;
  categoryId?: string;
  categoryTitle?: string;
  recommendationDescription?: string;
};

type ImportPreviewResult = {
  skills: ImportSkillState[];
  targets: ImportTargetState[];
};

type ImportViewModelOptions = {
  recommendationsLoader?: () => ImportRecommendationSeed[];
  searchLoader?: (query: string) => Promise<ImportGroupState[]>;
  previewLoader?: (groupId: string) => Promise<ImportPreviewResult>;
  importer?: (
    groupId: string,
    draft: { selectedSkillIds: string[]; enabledTargets: string[] },
  ) => Promise<{ sourceId: string }>;
  mutationCoordinator?: MutationCoordinator;
  onImportCompleted?: () => Promise<void> | void;
  onChange?: () => void;
};

type ImportDisplayGroup = ImportGroupState;

type ImportRecommendedSection = {
  categoryId: string;
  title: string;
  groups: ImportDisplayGroup[];
};

export type ImportContent =
  | { kind: "recommended"; sections: ImportRecommendedSection[] }
  | { kind: "searchResults"; groups: ImportDisplayGroup[] };

export class ImportViewModel {
  private internalSearchText = "";
  private internalPlaceholderIndex = 0;
  private readonly recommendationsLoader: () => ImportRecommendationSeed[];
  private readonly searchLoader: (query: string) => Promise<ImportGroupState[]>;
  private readonly previewLoader: (groupId: string) => Promise<ImportPreviewResult>;
  private readonly importer: (
    groupId: string,
    draft: { selectedSkillIds: string[]; enabledTargets: string[] },
  ) => Promise<{ sourceId: string }>;
  private readonly mutationCoordinator: MutationCoordinator;
  private readonly onImportCompleted: () => Promise<void> | void;
  private readonly onChange: () => void;

  constructor(
    private readonly state: DesktopAppState,
    options: ImportViewModelOptions = {},
  ) {
    this.recommendationsLoader = options.recommendationsLoader ?? (() => []);
    this.searchLoader = options.searchLoader ?? (async () => []);
    this.previewLoader = options.previewLoader ?? (async () => ({ skills: [], targets: [] }));
    this.importer = options.importer ?? (async (sourceId) => ({ sourceId }));
    this.mutationCoordinator =
      options.mutationCoordinator ?? createPassthroughMutationCoordinator();
    this.onImportCompleted = options.onImportCompleted ?? (() => undefined);
    this.onChange = options.onChange ?? (() => undefined);
  }

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get draftsByItemId(): Record<string, ImportDraftState> {
    return this.state.importState.draftsByItemId;
  }

  get importSubmittedQuery(): string {
    return this.state.importState.importSubmittedQuery;
  }

  get importSearchText(): string {
    return this.internalSearchText;
  }

  get importPlaceholderText(): string {
    return searchPlaceholders[this.internalPlaceholderIndex] ?? searchPlaceholders[0];
  }

  setSearchText(value: string): void {
    this.internalSearchText = value;
    this.onChange();
  }

  get searchPhase(): ResourcePhase {
    return this.state.importState.importSearchPhase;
  }

  get failedSearchMessage(): string | undefined {
    return this.state.importState.importSearchPhase.kind === "failed"
      ? this.state.importState.importSearchPhase.message
      : undefined;
  }

  get desktopLanguage(): string {
    return this.state.settings.desktopLanguageRawValue;
  }

  get content(): ImportContent {
    if (this.importSubmittedQuery.trim()) {
      return {
        kind: "searchResults",
        groups: this.state.importState.searchGroups.map(stripRecommendationFields),
      };
    }

    const sectionEntries = new Map<string, ImportRecommendedSection>();
    for (const group of this.state.importState.recommendedGroups) {
      const categoryId = group.categoryId ?? "recommended";
      const title = group.categoryTitle ?? "Recommended";
      const existing = sectionEntries.get(categoryId);
      if (existing) {
        existing.groups.push(group);
        continue;
      }
      sectionEntries.set(categoryId, {
        categoryId,
        title,
        groups: [group],
      });
    }

    return {
      kind: "recommended",
      sections: [...sectionEntries.values()],
    };
  }

  async loadImportPageIfNeeded(): Promise<void> {
    if (this.state.importState.recommendedGroups.length === 0) {
      this.state.importState.recommendedGroups = this.recommendationsLoader().map((entry) => {
        const group: ImportGroupState = {
          id: entry.id,
          title: entry.title,
          locator: entry.locator,
          previewPhase: { kind: "idle" },
          skills: [],
          targets: [],
        };
        if (entry.categoryId) {
          group.categoryId = entry.categoryId;
        }
        if (entry.categoryTitle) {
          group.categoryTitle = entry.categoryTitle;
        }
        if (entry.isInstalledLocally) {
          group.isInstalledLocally = entry.isInstalledLocally;
        }
        if (entry.recommendationDescription) {
          group.recommendationDescription = entry.recommendationDescription;
        }
        return group;
      });
    }

    this.state.importState.importSubmittedQuery = "";
    if (this.state.importState.importSearchPhase.kind === "idle") {
      this.state.importState.importSearchPhase = { kind: "ready" };
    }
    this.onChange();
  }

  async submitSearch(query: string): Promise<void> {
    const normalizedQuery = query.trim();
    this.state.importState.importSubmittedQuery = normalizedQuery;
    if (!normalizedQuery) {
      this.state.importState.searchGroups = [];
      this.state.importState.importSearchPhase = { kind: "ready" };
      this.onChange();
      return;
    }

    this.state.importState.importSearchPhase = { kind: "loading" };
    this.onChange();
    try {
      this.state.importState.searchGroups = await this.searchLoader(normalizedQuery);
      this.state.importState.importSearchPhase = { kind: "ready" };
    } catch (error) {
      this.state.importState.importSearchPhase = {
        kind: "failed",
        message: error instanceof Error
          ? error.message
          : localize("error.import_search_failed", this.desktopLanguage),
      };
    }
    this.onChange();
  }

  async previewImportGroupIfNeeded(groupId: string): Promise<void> {
    const group = findImportGroup(this.state, groupId);
    if (!group || group.previewPhase.kind !== "idle") {
      return;
    }

    group.previewPhase = { kind: "loading" };
    this.onChange();
    try {
      const preview = await this.previewLoader(groupId);
      group.skills = [...preview.skills];
      group.targets = [...preview.targets];
      group.previewPhase = { kind: "ready" };
    } catch (error) {
      group.previewPhase = {
        kind: "failed",
        message: error instanceof Error
          ? error.message
          : localize("error.import_preview_failed", this.desktopLanguage),
      };
    }
    this.onChange();
  }

  async importGroup(groupId: string): Promise<void> {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return;
    }
    if (group.isInstalledLocally) {
      this.state.view.toastMessage = localize("toast.import.already_installed", this.desktopLanguage);
      this.onChange();
      return;
    }

    const draft = this.draftsByItemId[groupId] ?? {
      selectedSkillIds: group.skills.map((skill) => skill.id),
      enabledTargetIds: [],
    };
    try {
      const result = await this.mutationCoordinator.run(() =>
        this.importer(groupId, {
          selectedSkillIds: draft.selectedSkillIds,
          enabledTargets: draft.enabledTargetIds,
        }),
      );

      markImportGroupInstalled(this.state, group);
      if (this.currentRoute.kind !== "importPage") {
        this.state.view.selectedSourceId = result.sourceId;
        this.state.view.currentRoute = {
          kind: "detail",
          sourceId: result.sourceId,
        };
      }
      this.state.view.toastMessage = localize("toast.import.success", this.desktopLanguage);
      await this.onImportCompleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.view.toastMessage = localize("toast.import.failed", this.desktopLanguage).replace("%@", message);
      this.onChange();
      return;
    }
    this.onChange();
  }
}

const searchPlaceholders = [
  "search packages, authors, repos",
];

function findImportGroup(state: DesktopAppState, groupId: string): ImportGroupState | undefined {
  return [...state.importState.recommendedGroups, ...state.importState.searchGroups].find(
    (group) => group.id === groupId,
  );
}

function markImportGroupInstalled(state: DesktopAppState, targetGroup: ImportGroupState): void {
  for (const group of [...state.importState.recommendedGroups, ...state.importState.searchGroups]) {
    if (group.id === targetGroup.id || group.locator === targetGroup.locator) {
      group.isInstalledLocally = true;
    }
  }
}

function stripRecommendationFields(group: ImportGroupState): ImportGroupState {
  const stripped: ImportGroupState = {
    ...group,
  };
  delete stripped.recommendationDescription;
  return stripped;
}

import type { DesktopAppState } from "../store/desktop-app-state";
import type {
  ImportDraftState,
  ImportGroupState,
  ImportSkillState,
  ImportTargetState,
} from "../store/import-state";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";

type ImportRecommendationSeed = {
  id: string;
  title: string;
  locator: string;
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
  private readonly recommendationsLoader: () => ImportRecommendationSeed[];
  private readonly searchLoader: (query: string) => Promise<ImportGroupState[]>;
  private readonly previewLoader: (groupId: string) => Promise<ImportPreviewResult>;

  constructor(
    private readonly state: DesktopAppState,
    options: ImportViewModelOptions = {},
  ) {
    this.recommendationsLoader = options.recommendationsLoader ?? (() => []);
    this.searchLoader = options.searchLoader ?? (async () => []);
    this.previewLoader = options.previewLoader ?? (async () => ({ skills: [], targets: [] }));
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

  get searchPhase(): ResourcePhase {
    return this.state.importState.importSearchPhase;
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
  }

  async submitSearch(query: string): Promise<void> {
    const normalizedQuery = query.trim();
    this.state.importState.importSubmittedQuery = normalizedQuery;
    if (!normalizedQuery) {
      this.state.importState.searchGroups = [];
      this.state.importState.importSearchPhase = { kind: "ready" };
      return;
    }

    this.state.importState.importSearchPhase = { kind: "loading" };
    try {
      this.state.importState.searchGroups = await this.searchLoader(normalizedQuery);
      this.state.importState.importSearchPhase = { kind: "ready" };
    } catch (error) {
      this.state.importState.importSearchPhase = {
        kind: "failed",
        message: error instanceof Error ? error.message : "Import search failed.",
      };
    }
  }

  async previewImportGroupIfNeeded(groupId: string): Promise<void> {
    const group = findImportGroup(this.state, groupId);
    if (!group || group.previewPhase.kind !== "idle") {
      return;
    }

    group.previewPhase = { kind: "loading" };
    try {
      const preview = await this.previewLoader(groupId);
      group.skills = [...preview.skills];
      group.targets = [...preview.targets];
      group.previewPhase = { kind: "ready" };
    } catch (error) {
      group.previewPhase = {
        kind: "failed",
        message: error instanceof Error ? error.message : "Import preview failed.",
      };
    }
  }
}

function findImportGroup(state: DesktopAppState, groupId: string): ImportGroupState | undefined {
  return [...state.importState.recommendedGroups, ...state.importState.searchGroups].find(
    (group) => group.id === groupId,
  );
}

function stripRecommendationFields(group: ImportGroupState): ImportGroupState {
  const stripped: ImportGroupState = {
    ...group,
  };
  delete stripped.recommendationDescription;
  return stripped;
}

import type { DesktopAppState } from "../store/desktop-app-state";
import { localize } from "../i18n";
import recommendations from "../assets/ImportRecommendations/recommendations.json";
import type {
  ImportDraftState,
  ImportGroupState,
  ImportSkillState,
  ImportTargetState,
} from "../store/import-state";
import type { DesktopRoute } from "../navigation/desktop-route";
import type { ResourcePhase } from "../store/async-resource-state";
import type { DesktopAccentColor, DesktopThemeMode } from "../theme/app-theme";
import {
  agentDisplayShortLabel,
  agentDisplayTitle,
  normalizeAgentDisplayPreferences,
} from "../runtime/settings-store";
import {
  createPassthroughMutationCoordinator,
  type MutationCoordinator,
} from "../runtime/mutation-coordinator";

type ImportRecommendationSeed = {
  id: string;
  title: string;
  locator: string;
  canonicalRepo?: string;
  isInstalledLocally?: boolean;
  skillCount?: number;
  downloadCount?: number;
  starCount?: number;
  repoUrl?: string;
  categoryId?: string;
  categoryTitle?: string;
  recommendationDescription?: string;
  recommendationBadgeItems?: Array<{ id: string; title: string; isPrimary: boolean }>;
};

type BundledRecommendationEntry = {
  canonicalRepo: string;
  locator: string;
  categoryId: string;
  primaryTagId: string;
  secondaryTagIds: string[];
  descriptionKey: string;
  sortOrder: number;
};

type ImportPreviewResult = {
  skills: ImportSkillState[];
  targets: ImportTargetState[];
};

const bundledRecommendations = recommendations as BundledRecommendationEntry[];

type ImportViewModelOptions = {
  recommendationsLoader?: () => ImportRecommendationSeed[];
  searchLoader?: (query: string) => Promise<ImportGroupState[]>;
  previewLoader?: (groupId: string) => Promise<ImportPreviewResult>;
  importer?: (
    groupId: string,
    draft: { selectedSkillIds: string[]; enabledTargets: string[] },
  ) => Promise<{ sourceId: string }>;
  mutationCoordinator?: MutationCoordinator;
  openExternalUrl?: (url: string) => Promise<void>;
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
  private readonly openExternalUrl: (url: string) => Promise<void>;
  private readonly mutationCoordinator: MutationCoordinator;
  private readonly onImportCompleted: () => Promise<void> | void;
  private readonly onChange: () => void;
  private importingGroupId: string | undefined;

  constructor(
    private readonly state: DesktopAppState,
    options: ImportViewModelOptions = {},
  ) {
    this.recommendationsLoader = options.recommendationsLoader
      ?? (() => defaultRecommendationSeeds(this.state, this.desktopLanguage));
    this.searchLoader = options.searchLoader ?? (async () => []);
    this.previewLoader = options.previewLoader ?? (async () => ({ skills: [], targets: [] }));
    this.importer = options.importer ?? (async (sourceId) => ({ sourceId }));
    this.openExternalUrl = options.openExternalUrl ?? (async () => undefined);
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
    return searchPlaceholders[this.internalPlaceholderIndex] ?? searchPlaceholders[0]!;
  }

  setSearchText(value: string): void {
    this.internalSearchText = value;
    this.onChange();
  }

  get searchPhase(): ResourcePhase {
    return this.state.importState.importSearchPhase;
  }

  isImportingGroup(groupId: string): boolean {
    return this.importingGroupId === groupId;
  }

  get failedSearchMessage(): string | undefined {
    return this.state.importState.importSearchPhase.kind === "failed"
      ? this.state.importState.importSearchPhase.message
      : undefined;
  }

  get desktopLanguage(): string {
    return this.state.settings.desktopLanguageRawValue;
  }

  get themeMode(): DesktopThemeMode {
    return this.state.settings.themeModeRawValue as DesktopThemeMode;
  }

  get themeAccent(): DesktopAccentColor {
    return this.state.settings.themeAccentRawValue as DesktopAccentColor;
  }

  showHome(): void {
    this.state.view.currentRoute = { kind: "home" };
    this.onChange();
  }

  async openRepositoryUrl(url: string): Promise<void> {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }
    await this.openExternalUrl(normalizedUrl);
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
        if (entry.canonicalRepo) {
          group.canonicalRepo = entry.canonicalRepo;
        }
        if (entry.skillCount !== undefined) {
          group.skillCount = entry.skillCount;
        }
        if (entry.downloadCount !== undefined) {
          group.downloadCount = entry.downloadCount;
        }
        if (entry.starCount !== undefined) {
          group.starCount = entry.starCount;
        }
        if (entry.repoUrl) {
          group.repoUrl = entry.repoUrl;
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
        if (entry.recommendationBadgeItems) {
          group.recommendationBadgeItems = entry.recommendationBadgeItems;
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

  draftForGroup(groupId: string): ImportDraftState | undefined {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return undefined;
    }
    return this.draftsByItemId[groupId] ?? defaultDraftForGroup(group);
  }

  targetsForGroup(groupId: string): ImportTargetState[] {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return [];
    }
    return effectiveTargetsForGroup(this.state, group);
  }

  targetLabel(targetId: string): string {
    return agentDisplayTitle(targetId, this.state.settings.customAgents);
  }

  targetShortLabel(targetId: string): string {
    return agentDisplayShortLabel(targetId, this.state.settings.customAgents);
  }

  setSkillEnabled(groupId: string, skillId: string, enabled: boolean): void {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return;
    }
    const current = this.draftForGroup(groupId) ?? defaultDraftForGroup(group);
    const selectedSkillIds = new Set(current.selectedSkillIds);
    if (enabled) {
      selectedSkillIds.add(skillId);
    } else {
      selectedSkillIds.delete(skillId);
    }
    this.state.importState.draftsByItemId[groupId] = {
      selectedSkillIds: group.skills.map((skill) => skill.id).filter((id) => selectedSkillIds.has(id)),
      enabledTargetIds: current.enabledTargetIds,
    };
    this.onChange();
  }

  toggleAllSkills(groupId: string): void {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return;
    }
    const current = this.draftForGroup(groupId) ?? defaultDraftForGroup(group);
    this.state.importState.draftsByItemId[groupId] = {
      selectedSkillIds: current.selectedSkillIds.length === group.skills.length ? [] : group.skills.map((skill) => skill.id),
      enabledTargetIds: current.enabledTargetIds,
    };
    this.onChange();
  }

  setTargetEnabled(groupId: string, targetId: string, enabled: boolean): void {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return;
    }
    const current = this.draftForGroup(groupId) ?? defaultDraftForGroup(group);
    const targets = effectiveTargetsForGroup(this.state, group);
    const enabledTargetIds = new Set(current.enabledTargetIds);
    if (enabled) {
      enabledTargetIds.add(targetId);
    } else {
      enabledTargetIds.delete(targetId);
    }
    this.state.importState.draftsByItemId[groupId] = {
      selectedSkillIds: current.selectedSkillIds,
      enabledTargetIds: targets.map((target) => target.id).filter((id) => enabledTargetIds.has(id)),
    };
    this.onChange();
  }

  toggleAllTargets(groupId: string): void {
    const group = findImportGroup(this.state, groupId);
    if (!group) {
      return;
    }
    const current = this.draftForGroup(groupId) ?? defaultDraftForGroup(group);
    const targets = effectiveTargetsForGroup(this.state, group);
    const targetIds = targets.map((target) => target.id);
    const enabledTargetIds = current.enabledTargetIds.filter((targetId) => targetIds.includes(targetId));
    this.state.importState.draftsByItemId[groupId] = {
      selectedSkillIds: current.selectedSkillIds,
      enabledTargetIds: enabledTargetIds.length === targetIds.length ? [] : targetIds,
    };
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

    const draft = this.draftForGroup(groupId) ?? defaultDraftForGroup(group);
    this.importingGroupId = groupId;
    this.onChange();
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
      this.importingGroupId = undefined;
      this.onChange();
      return;
    }
    this.importingGroupId = undefined;
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

function defaultDraftForGroup(group: ImportGroupState): ImportDraftState {
  return {
    selectedSkillIds: group.skills.map((skill) => skill.id),
    enabledTargetIds: [],
  };
}

function effectiveTargetsForGroup(state: DesktopAppState, group: ImportGroupState): ImportTargetState[] {
  if (group.targets.length > 0) {
    return group.targets;
  }

  const detectedTargetIds = detectedTargetIdsForImport(state);
  if (detectedTargetIds.size === 0) {
    return [];
  }

  return normalizeAgentDisplayPreferences(
    state.settings.agentDisplayPreferences,
    state.settings.customAgents,
  )
    .filter((preference) => preference.isVisible && detectedTargetIds.has(preference.targetId))
    .slice(0, 10)
    .map((preference) => ({
      id: preference.targetId,
      selectedByDefault: false,
    }));
}

function detectedTargetIdsForImport(state: DesktopAppState): Set<string> {
  const targetIds: string[] = [];
  for (const summary of state.workspace.inventorySummaries) {
    targetIds.push(...(summary.targets ?? []).map((target) => target.id));
  }
  for (const detail of Object.values(state.detailState.detailsBySourceId)) {
    targetIds.push(...detail.targets.map((target) => target.id));
  }
  return new Set(targetIds.filter((targetId) => targetId.length > 0));
}

function stripRecommendationFields(group: ImportGroupState): ImportGroupState {
  const stripped: ImportGroupState = {
    ...group,
  };
  delete stripped.recommendationDescription;
  delete stripped.recommendationBadgeItems;
  return stripped;
}

function defaultRecommendationSeeds(state: DesktopAppState, language: string): ImportRecommendationSeed[] {
  const installedLocators = new Set(
    state.workspace.inventorySummaries.flatMap((summary) => [
      normalizedRecommendationKey(summary.sourceId),
      normalizedRecommendationKey(summary.locator),
      normalizedRecommendationKey(summary.repoUrl),
    ]).filter((value): value is string => value.length > 0),
  );

  return bundledRecommendations
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.canonicalRepo.localeCompare(right.canonicalRepo))
    .map((entry) => {
      const normalizedRepo = normalizedRecommendationKey(entry.canonicalRepo);
      return {
        id: normalizedRepo.replaceAll("/", "-"),
        title: titleFromRepo(entry.canonicalRepo),
        locator: entry.locator,
        canonicalRepo: entry.canonicalRepo,
        isInstalledLocally: installedLocators.has(normalizedRepo),
        categoryId: entry.categoryId,
        categoryTitle: localize(`import.recommendation.category.${entry.categoryId}`, language),
        recommendationDescription: localize(entry.descriptionKey, language),
        recommendationBadgeItems: recommendationBadgeItems(entry, language),
      };
    });
}

function recommendationBadgeItems(
  entry: BundledRecommendationEntry,
  language: string,
): Array<{ id: string; title: string; isPrimary: boolean }> {
  return [entry.primaryTagId, ...entry.secondaryTagIds.slice(0, 2)]
    .filter((tagId): tagId is string => typeof tagId === "string" && tagId.length > 0)
    .map((tagId, index) => ({
      id: tagId,
      title: localize(`import.recommendation.tag.${tagId}`, language),
      isPrimary: index === 0,
    }));
}

function normalizedRecommendationKey(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }

  const githubMatch = trimmed.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (githubMatch?.[1] && githubMatch[2]) {
    return recommendationAlias(`${githubMatch[1]}/${githubMatch[2].replace(/\.git$/, "")}`);
  }

  const shorthand = trimmed.match(/^([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (shorthand?.[1] && shorthand[2]) {
    return recommendationAlias(`${shorthand[1]}/${shorthand[2].replace(/\.git$/, "")}`);
  }

  return recommendationAlias(trimmed.replace(/\.git$/, ""));
}

function recommendationAlias(repo: string): string {
  return repo === "anthropic/skills" ? "anthropics/skills" : repo;
}

function titleFromRepo(canonicalRepo: string): string {
  const repoName = canonicalRepo.split("/").pop() ?? canonicalRepo;
  return repoName
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => `${token.slice(0, 1).toUpperCase()}${token.slice(1)}`)
    .join(" ");
}

import recommendations from "../assets/ImportRecommendations/recommendations.json";
import { localize } from "../i18n";
import type { DesktopGroupTagStore } from "../runtime/group-tag-store";
import type { DesktopAppState } from "../store/desktop-app-state";
import type { InventorySummaryState, WorkspaceTagPreference } from "../store/workspace-state";
import type { DesktopAccentColor } from "../theme/app-theme";

type GroupTagControllerOptions = {
  groupTagStore?: Pick<DesktopGroupTagStore, "loadCustomTags" | "saveCustomTags">;
  language: () => string;
  onChange: () => void;
};

type RecommendationEntry = {
  canonicalRepo: string;
  locator: string;
  primaryTagId: string;
  secondaryTagIds: string[];
};

const bundledRecommendations = recommendations as RecommendationEntry[];
export const maximumGroupTagCount = 3;
const localizedTagIds = [
  "general",
  "development",
  "design",
  "creation",
  "marketing",
  "research",
  "teamwork",
  "automation",
  "frontend",
  "backend",
  "database",
  "writing",
  "content",
  "video",
  "productivity",
  "education",
  "knowledge",
  "workflow",
];
const supportedTagLanguages = ["en", "zh-Hans", "ja"];

export class GroupTagController {
  private readonly groupTagStore: Pick<DesktopGroupTagStore, "saveCustomTags"> | undefined;

  constructor(
    private readonly state: DesktopAppState,
    private readonly options: GroupTagControllerOptions,
  ) {
    this.groupTagStore = options.groupTagStore;
    if (options.groupTagStore) {
      this.state.workspace.customTagsBySourceId = {
        ...options.groupTagStore.loadCustomTags(),
        ...this.state.workspace.customTagsBySourceId,
      };
    }
  }

  get selectedHomeTagFilterId(): string | undefined {
    const selectedTagId = this.state.workspace.selectedHomeTagFilterId;
    if (!selectedTagId || this.homeTagFilters(this.state.workspace.sourceIds).some((tag) => tag.id === selectedTagId)) {
      return selectedTagId;
    }
    return undefined;
  }

  homeTagFilters(sourceIds: string[]): WorkspaceTagPreference[] {
    const values = sourceIds.flatMap((sourceId) => this.inventoryTags(sourceId));
    const seen = new Set<string>();
    const uniqueTags = values.filter((tag) => {
      if (seen.has(tag.id)) {
        return false;
      }
      seen.add(tag.id);
      return true;
    });
    return uniqueTags.sort((left, right) => left.title.localeCompare(right.title, undefined, { sensitivity: "base" }));
  }

  homeTagCountById(sourceIds: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const sourceId of sourceIds) {
      for (const tag of this.inventoryTags(sourceId)) {
        counts[tag.id] = (counts[tag.id] ?? 0) + 1;
      }
    }
    return counts;
  }

  setSelectedHomeTagFilter(tagId?: string): void {
    this.state.workspace.selectedHomeTagFilterId = tagId;
    this.options.onChange();
  }

  matchesSelectedHomeTag(sourceId: string): boolean {
    const selectedTagId = this.selectedHomeTagFilterId;
    if (!selectedTagId) {
      return true;
    }
    return this.inventoryTags(sourceId).some((tag) => tag.id === selectedTagId);
  }

  inventoryTags(sourceId: string): WorkspaceTagPreference[] {
    if (Object.hasOwn(this.state.workspace.customTagsBySourceId, sourceId)) {
      return (this.state.workspace.customTagsBySourceId[sourceId] ?? [])
        .slice(0, maximumGroupTagCount)
        .map((tag) => this.displayTag(tag));
    }

    const summary = this.state.workspace.inventorySummaries.find((card) => card.sourceId === sourceId);
    const recommendation = matchingRecommendation(summary, sourceId);
    if (!recommendation) {
      return [];
    }

    const tagIds = [recommendation.primaryTagId, ...recommendation.secondaryTagIds.slice(0, 2)];
    return tagIds.slice(0, maximumGroupTagCount).map((tagId) => ({
      id: `preset:${tagId}`,
      title: localize(`import.recommendation.tag.${tagId}`, this.language),
      accent: recommendationAccent(tagId),
    }));
  }

  tagSuggestions(sourceId: string, sourceIds: string[] = this.state.workspace.sourceIds): WorkspaceTagPreference[] {
    const currentIds = new Set(this.inventoryTags(sourceId).map((tag) => tag.id));
    if (currentIds.size >= maximumGroupTagCount) {
      return [];
    }
    return this.homeTagFilters(sourceIds).filter((tag) => !currentIds.has(tag.id));
  }

  canCreateGroupTag(sourceId: string): boolean {
    return this.inventoryTags(sourceId).length < maximumGroupTagCount;
  }

  canDeleteGroupTags(sourceId: string): boolean {
    return this.inventoryTags(sourceId).length > 0;
  }

  addCustomTag(sourceId: string, rawTitle: string, accent: DesktopAccentColor): void {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId) {
      this.state.view.toastMessage = localize("error.no_group_selected", this.language);
      this.options.onChange();
      return;
    }

    const currentTags = this.inventoryTags(normalizedSourceId);
    if (currentTags.length >= maximumGroupTagCount) {
      this.state.view.toastMessage = localize("group_tag.toast.limit", this.language);
      this.options.onChange();
      return;
    }

    const normalized = normalizedTagInput(rawTitle, this.language);
    if (!normalized.title) {
      this.state.view.toastMessage = localize("group_tag.toast.empty", this.language);
      this.options.onChange();
      return;
    }

    const tagId = normalized.tagId ? `preset:${normalized.tagId}` : customTagId(normalized.title);
    const identities = new Set(currentTags.flatMap(tagIdentities));
    const candidateIdentities = tagIdentities({ id: tagId, title: normalized.title });
    if (!isDisjoint(identities, candidateIdentities)) {
      this.state.view.toastMessage = localize("group_tag.toast.duplicate", this.language);
      this.options.onChange();
      return;
    }

    this.state.workspace.customTagsBySourceId[normalizedSourceId] = [
      ...currentTags,
      { id: tagId, title: normalized.title, accent },
    ].slice(0, maximumGroupTagCount);
    this.persistCustomTags();
    this.state.view.toastMessage = undefined;
    this.options.onChange();
  }

  removeCustomTag(sourceId: string, tagId: string): void {
    const normalizedSourceId = sourceId.trim();
    const currentTags = this.inventoryTags(normalizedSourceId);
    const nextTags = currentTags.filter((tag) => tag.id !== tagId);
    if (nextTags.length === currentTags.length) {
      this.state.view.toastMessage = localize("group_tag.toast.not_found", this.language);
      this.options.onChange();
      return;
    }

    this.state.workspace.customTagsBySourceId[normalizedSourceId] = nextTags;
    if (this.state.workspace.selectedHomeTagFilterId === tagId) {
      this.state.workspace.selectedHomeTagFilterId = undefined;
    }
    this.persistCustomTags();
    this.state.view.toastMessage = undefined;
    this.options.onChange();
  }

  private get language(): string {
    return this.options.language();
  }

  private persistCustomTags(): void {
    this.groupTagStore?.saveCustomTags(this.state.workspace.customTagsBySourceId);
  }

  private displayTag(tag: WorkspaceTagPreference): WorkspaceTagPreference {
    const presetTagId = presetTagIdFromKey(tag.id);
    if (!presetTagId) {
      return tag;
    }
    return {
      ...tag,
      title: localize(`import.recommendation.tag.${presetTagId}`, this.language),
      accent: tag.accent ?? recommendationAccent(presetTagId),
    };
  }
}

function matchingRecommendation(
  summary: InventorySummaryState | undefined,
  sourceId: string,
): RecommendationEntry | undefined {
  const candidates = new Set<string>();
  for (const value of [summary?.repoUrl, summary?.locator, sourceId]) {
    const normalized = normalizedRecommendationKey(value);
    if (normalized) {
      candidates.add(normalized);
    }
  }

  return bundledRecommendations.find((entry) => {
    const entryRepo = normalizedRecommendationKey(entry.canonicalRepo);
    const entryLocator = normalizedRecommendationKey(entry.locator);
    return candidates.has(entryRepo) || candidates.has(entryLocator);
  });
}

function normalizedRecommendationKey(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  const githubMatch = trimmed.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (githubMatch?.[1] && githubMatch[2]) {
    return `${githubMatch[1]}/${githubMatch[2].replace(/\.git$/, "")}`;
  }

  const shorthand = trimmed.match(/^([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (shorthand?.[1] && shorthand[2]) {
    return `${shorthand[1]}/${shorthand[2].replace(/\.git$/, "")}`;
  }

  return trimmed.replace(/\/+$/, "");
}

function normalizedTagInput(rawTitle: string, language: string): { title: string; tagId?: string } {
  const title = normalizedInputTitle(rawTitle, language);
  if (!title) {
    return { title: "" };
  }

  const tagId = matchingLocalizedTagId(title);
  if (tagId) {
    return {
      title: localize(`import.recommendation.tag.${tagId}`, language),
      tagId,
    };
  }
  return { title };
}

function normalizedInputTitle(rawTitle: string, language: string): string {
  const trimmed = rawTitle.trim();
  if (!trimmed) {
    return "";
  }

  const isZhHans = language === "zh-Hans" || language.toLowerCase().startsWith("zh");
  const isJapanese = language === "ja" || language.toLowerCase().startsWith("ja");
  if (isZhHans) {
    return [...trimmed].slice(0, 4).join("");
  }
  if (isJapanese) {
    return [...trimmed].slice(0, 7).join("");
  }
  return trimmed.split(/\s+/).slice(0, 2).join(" ").slice(0, 20);
}

function matchingLocalizedTagId(rawTitle: string): string | undefined {
  const normalizedTitle = normalizedTagKey(rawTitle);
  if (!normalizedTitle) {
    return undefined;
  }

  return localizedTagIds.find((tagId) =>
    supportedTagLanguages.some(
      (language) => normalizedTagKey(localize(`import.recommendation.tag.${tagId}`, language)) === normalizedTitle,
    ),
  );
}

function tagIdentities(tag: WorkspaceTagPreference): string[] {
  const identities = [normalizedTagKey(tag.title)];
  const presetTagId = presetTagIdFromKey(tag.id);
  if (presetTagId) {
    identities.push(`preset:${presetTagId}`);
  }
  return identities.filter((identity) => identity.length > 0);
}

function customTagId(title: string): string {
  return `custom:${normalizedTagKey(title)}`;
}

function presetTagIdFromKey(key: string): string | undefined {
  return key.startsWith("preset:") ? key.slice("preset:".length) : undefined;
}

function normalizedTagKey(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isDisjoint(left: Set<string>, right: string[]): boolean {
  return right.every((value) => !left.has(value));
}

function recommendationAccent(tagId: string): DesktopAccentColor {
  const accents: Record<string, DesktopAccentColor> = {
    general: "blue",
    development: "green",
    design: "purple",
    creation: "pink",
    marketing: "orange",
    research: "yellow",
    teamwork: "blue",
    automation: "green",
    frontend: "green",
    backend: "blue",
    database: "yellow",
    writing: "pink",
    content: "orange",
    video: "purple",
    productivity: "green",
    education: "yellow",
    knowledge: "blue",
    workflow: "purple",
  };
  return accents[tagId] ?? "blue";
}

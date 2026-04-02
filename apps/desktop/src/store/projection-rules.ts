export type ProjectionLeafSummary = {
  id: string;
  linkName: string;
  name: string;
  description: string;
};

export type ProjectionSourceSummary = {
  sourceId: string;
  displayName: string;
  locator: string;
  leafs: ProjectionLeafSummary[];
};

export type ProjectionDraftState = {
  enabledTargets: string[];
  selectedLeafIds: string[];
};

export type ProjectionNameMap = Record<string, string>;

type ProjectionCandidate = {
  source: ProjectionSourceSummary;
  leaf: ProjectionLeafSummary;
};

export function buildProjectionNameMap(input: {
  summaries: ProjectionSourceSummary[];
  drafts: Record<string, ProjectionDraftState>;
  sourceId: string;
}): ProjectionNameMap {
  const currentSummary = input.summaries.find((summary) => summary.sourceId === input.sourceId);
  const currentDraft = input.drafts[input.sourceId] ?? {
    enabledTargets: [],
    selectedLeafIds: [],
  };

  if (!currentSummary || currentDraft.enabledTargets.length === 0) {
    return {};
  }

  const enabledTargets = new Set(currentDraft.enabledTargets);
  const candidates = selectedLeafCandidates({
    summaries: input.summaries,
    drafts: input.drafts,
    excludedSourceId: input.sourceId,
    enabledTargets,
  });

  return resolveProjectedSkillNames(candidates);
}

function selectedLeafCandidates(input: {
  summaries: ProjectionSourceSummary[];
  drafts: Record<string, ProjectionDraftState>;
  excludedSourceId: string;
  enabledTargets: Set<string>;
}): ProjectionCandidate[] {
  return input.summaries.flatMap((summary) => {
    if (summary.sourceId === input.excludedSourceId) {
      return [];
    }
    const draft = input.drafts[summary.sourceId] ?? {
      enabledTargets: [],
      selectedLeafIds: [],
    };
    const hasTargetOverlap = draft.enabledTargets.some((targetId) =>
      input.enabledTargets.has(targetId),
    );
    if (!hasTargetOverlap) {
      return [];
    }

    return draft.selectedLeafIds.flatMap((leafId) => {
      const leaf = summary.leafs.find((item) => item.id === leafId);
      return leaf ? [{ source: summary, leaf }] : [];
    });
  });
}

function resolveProjectedSkillNames(candidates: ProjectionCandidate[]): ProjectionNameMap {
  const reservedNames = new Set<string>();
  const projectedNames: ProjectionNameMap = {};

  for (const candidate of candidates) {
    const groupAuthor = authorFromLocator(candidate.source.locator);
    const preferredNames = projectedNameCandidates(
      groupAuthor
        ? {
            sourceId: candidate.source.sourceId,
            groupName: candidate.source.displayName,
            groupAuthor,
            skillName: candidate.leaf.linkName,
          }
        : {
            sourceId: candidate.source.sourceId,
            groupName: candidate.source.displayName,
            skillName: candidate.leaf.linkName,
          },
    );
    const fallbackName = preferredNames[preferredNames.length - 1];
    if (!fallbackName) {
      continue;
    }
    const chosenName =
      preferredNames.find((name) => !reservedNames.has(name)) ?? fallbackName;

    reservedNames.add(chosenName);
    projectedNames[candidate.leaf.id] = chosenName;
  }

  return projectedNames;
}

function projectedNameCandidates(input: {
  sourceId: string;
  groupName: string;
  groupAuthor?: string;
  skillName: string;
}): string[] {
  const names = [input.skillName, `${input.groupName}-${input.skillName}`];
  if (input.groupAuthor && input.groupAuthor.length > 0) {
    names.push(`${input.groupAuthor}-${input.groupName}-${input.skillName}`);
  }
  names.push(`${input.sourceId}-${input.skillName}`);
  return uniquePreservingOrder(names);
}

function authorFromLocator(locator: string): string | undefined {
  const trimmed = locator.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const githubSlashIndex = trimmed.toLowerCase().indexOf("github.com/");
  if (githubSlashIndex >= 0) {
    const author = trimmed.slice(githubSlashIndex + "github.com/".length).split("/")[0];
    return author || undefined;
  }

  const githubColonIndex = trimmed.toLowerCase().indexOf("github.com:");
  if (githubColonIndex >= 0) {
    const author = trimmed.slice(githubColonIndex + "github.com:".length).split("/")[0];
    return author || undefined;
  }

  const components = trimmed.split("/");
  const author = components.length >= 2 ? components[0] : undefined;
  return author || undefined;
}

function uniquePreservingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }

  return unique;
}

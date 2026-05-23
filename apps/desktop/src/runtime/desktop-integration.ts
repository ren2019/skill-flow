import type { DesktopBridgeClient } from "../bridge/client";
import type { DesktopBridgeResponse } from "../bridge/types";
import type { DesktopAppState } from "../store/desktop-app-state";
import type { DetailRecord, DetailDocumentTab, DetailFileTreeItem, DetailSkillState, DetailTargetState } from "../store/detail-state";
import type { ImportGroupState, ImportSkillState, ImportTargetState } from "../store/import-state";
import type { ProjectScopeSelection, RecentProjectScopeItem } from "../store/settings-state";
import type { InventorySummaryState } from "../store/workspace-state";
import { seedDetailUiSelectionState } from "../view-models/detail-view-model";

export type DesktopIntegration = {
  refreshInventory(): Promise<void>;
  loadDetail?(sourceId: string): Promise<void>;
  updateSource?(sourceId: string): Promise<unknown>;
  updateSources?(sourceIds: string[]): Promise<unknown>;
  updateSelection?(
    sourceId: string,
    draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
  ): Promise<void>;
  searchImportGroups?(query: string): Promise<ImportGroupState[]>;
  previewImportSource?(locator: string): Promise<{ skills: ImportSkillState[]; targets: ImportTargetState[] }>;
  importSource?(
    locator: string,
    draft: { selectedSkillIds: string[]; enabledTargets: string[] },
  ): Promise<{ sourceId: string }>;
  togglePinnedSource?(sourceId: string): Promise<string[] | undefined>;
  deleteSource?(sourceId: string): Promise<void>;
};

type DesktopIntegrationOptions = {
  bridgeClient?: DesktopBridgeClient;
};

type DesktopWorkflowSummary = {
  source?: {
    id?: string;
    displayName?: string;
    locator?: string;
  };
  leafs?: Array<{ id?: string; name?: string; linkName?: string; title?: string }>;
  bindings?: {
    selectedLeafIds?: string[];
    targets?: Record<string, { enabled?: boolean }>;
  };
  activeTargetCount?: number;
  health?: string;
  issueCounts?: { warning?: number; error?: number };
};

type DesktopInventoryListResult = {
  summaries?: DesktopWorkflowSummary[];
  pinnedSourceIds?: string[];
  recentProjects?: Array<{
    projectId?: string;
    title?: string;
    lastActivityAt?: string;
    projectPath?: string;
    tools?: string[];
  }>;
  selectedProjectScope?: ProjectScopeSelection;
  groupCardEnrichmentBySourceId?: Record<string, {
    sourceMetadata?: {
      status?: string;
      data?: {
        ownerHandle?: string;
        starCount?: number;
      };
    };
    sourceSnapshot?: {
      totalInstalls?: number;
      repoStars?: number;
      repoUrl?: string;
    };
    groupPath?: string;
  }>;
};

type DesktopInspectResult = {
  summary?: DesktopWorkflowSummary & {
    lock?: {
      checkoutPath?: string;
      updatedAt?: string;
      commitSha?: string;
      resolvedVersion?: string;
    };
  };
  source?: {
    id?: string;
    displayName?: string;
    locator?: string;
    kind?: string;
  };
  binding?: {
    selectedLeafIds?: string[];
    targets?: Record<string, { enabled?: boolean; leafIds?: string[] }>;
  };
  leafs?: Array<{
    id?: string;
    name?: string;
    linkName?: string;
    title?: string;
    relativePath?: string;
    absolutePath?: string;
    skillFilePath?: string;
    description?: string;
    documentContent?: string;
    documents?: DetailDocumentTab[];
  }>;
  deployments?: Array<{
    target?: string;
    targetPath?: string;
    targetRootPath?: string;
  }>;
  fileTree?: DetailFileTreeItem[];
  groupDocuments?: DetailDocumentTab[];
};

type DesktopInspectEnrichmentResult = {
  sourceMetadata?: {
    status?: string;
    data?: {
      ownerHandle?: string;
      ownerDisplayName?: string;
      starCount?: number;
      description?: string;
    };
  };
  sourceSnapshot?: {
    repoStars?: number;
    totalInstalls?: number;
    repoLabel?: string;
    repoUrl?: string;
    summary?: string;
  };
};

type DesktopImportSearchResult = {
  groups?: Array<{
    id?: string;
    title?: string;
    locator?: string;
    canonicalRepo?: string;
    installed?: boolean;
    repoUrl?: string;
    starCount?: number;
    totalInstalls?: number;
    skillCount?: number;
    snapshot?: {
      canonicalRepo?: string;
      repoUrl?: string;
      repoStars?: number;
      totalInstalls?: number;
      skillCount?: number;
      skills?: Array<{
        skillId?: string;
        title?: string;
      }>;
    };
    previewState?: DesktopImportPreviewState;
  }>;
};

type DesktopImportPreviewState = {
  status?: string;
  reasonCode?: string;
};

type DesktopImportPreviewResult = {
  status?: string;
  reasonCode?: string;
  selectedSkillIds?: string[];
  enabledTargets?: string[];
  skills?: Array<{
    id?: string;
    title?: string;
    summary?: string;
  }>;
  targets?: Array<{
    id?: string;
  }>;
};

type DesktopImportSourceResult = {
  status?: string;
  reasonCode?: string;
  sourceId?: string;
};

const targetLabelsById: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  "github-copilot": "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
  opencode: "OpenCode",
  openclaw: "OpenClaw",
  "hermes-agent": "Hermes Agent",
  pi: "PI",
  trae: "Trae",
  windsurf: "Windsurf",
  "roo-code": "Roo Code",
  cline: "Cline",
  amp: "Amp",
  kiro: "Kiro",
};

const targetShortLabelsById: Record<string, string> = {
  "claude-code": "CC",
  codex: "CX",
  cursor: "CU",
  "github-copilot": "GH",
  "gemini-cli": "GM",
  opencode: "OP",
  openclaw: "OC",
  "hermes-agent": "HA",
  pi: "PI",
  trae: "TR",
  windsurf: "WS",
  "roo-code": "RO",
  cline: "CL",
  amp: "AM",
  kiro: "KI",
};

export function createDesktopIntegration(
  state: DesktopAppState,
  options: DesktopIntegrationOptions = {},
): DesktopIntegration {
  let bridgeClientPromise: Promise<DesktopBridgeClient> | undefined;

  const getBridgeClient = async (): Promise<DesktopBridgeClient> => {
    if (options.bridgeClient) {
      return options.bridgeClient;
    }

    bridgeClientPromise ??= import("../bridge/client").then(({ createDesktopBridgeClient }) =>
      createDesktopBridgeClient(),
    );
    return bridgeClientPromise;
  };

  return {
    async refreshInventory() {
      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("list");
      applyInventoryList(state, response);
    },
    async loadDetail(sourceId: string) {
      const normalizedSourceId = sourceId.trim();
      if (!normalizedSourceId) {
        return;
      }

      const bridgeClient = await getBridgeClient();
      const scope = toBridgeProjectScope(state.settings.selectedProjectScope);
      const [inspectResponse, enrichmentResponse] = await Promise.all([
        bridgeClient.invoke("inspect", {
          sourceId: normalizedSourceId,
          scope,
        }),
        bridgeClient.invoke("inspect-enrichment", {
          sourceId: normalizedSourceId,
        }),
      ]);

      const detail = toDetailRecord(normalizedSourceId, inspectResponse, enrichmentResponse);
      state.detailState.detailsBySourceId[normalizedSourceId] = detail;
      seedDetailUiSelectionState(state, normalizedSourceId, detail);
    },
    async updateSource(sourceId: string) {
      const normalizedSourceId = sourceId.trim();
      if (!normalizedSourceId) {
        return;
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("update", {
        sourceIds: [normalizedSourceId],
      });
      return expectOptionalOkRecord(response, "update");
    },
    async updateSources(sourceIds: string[]) {
      const normalizedSourceIds = sourceIds.map((sourceId) => sourceId.trim()).filter((sourceId) => sourceId.length > 0);
      if (normalizedSourceIds.length === 0) {
        return undefined;
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("update", {
        sourceIds: normalizedSourceIds,
      });
      return expectOptionalOkRecord(response, "update");
    },
    async updateSelection(sourceId, draft) {
      const normalizedSourceId = sourceId.trim();
      if (!normalizedSourceId) {
        return;
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("apply", {
        sourceId: normalizedSourceId,
        scope: toBridgeProjectScope(state.settings.selectedProjectScope),
        draft: {
          selectedLeafIds: draft.selectedSkillIds,
          enabledTargets: draft.enabledTargetIds,
        },
      });
      expectOptionalOkRecord(response, "apply");
    },
    async searchImportGroups(query) {
      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("search-import-groups", {
        query,
      });
      const data = expectOkRecord(response, "search-import-groups") as DesktopImportSearchResult;
      return toImportGroups(data);
    },
    async previewImportSource(locator) {
      const normalizedLocator = locator.trim();
      if (!normalizedLocator) {
        return { skills: [], targets: [] };
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("preview-import-source", {
        locator: normalizedLocator,
      });
      const data = expectOkRecord(response, "preview-import-source") as DesktopImportPreviewResult;
      return toImportPreview(data);
    },
    async importSource(locator, draft) {
      const normalizedLocator = locator.trim();
      if (!normalizedLocator) {
        throw new Error("Import source locator is required.");
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("import-source", {
        locator: normalizedLocator,
        draft: {
          selectedSkillIds: draft.selectedSkillIds,
          enabledTargets: draft.enabledTargets,
        },
      });
      const data = expectOkRecord(response, "import-source") as DesktopImportSourceResult;
      if (data.status !== "ready") {
        throw new Error(data.reasonCode ?? "unknown");
      }
      if (typeof data.sourceId !== "string" || data.sourceId.length === 0) {
        throw new Error("Desktop bridge import-source response requires a sourceId.");
      }
      return { sourceId: data.sourceId };
    },
    async togglePinnedSource(sourceId: string) {
      const normalizedSourceId = sourceId.trim();
      if (!normalizedSourceId) {
        return undefined;
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("toggle-pin", {
        sourceId: normalizedSourceId,
      });
      const data = expectOkRecord(response, "toggle-pin");
      return Array.isArray(data.pinnedSourceIds)
        ? data.pinnedSourceIds.filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0)
        : undefined;
    },
    async deleteSource(sourceId: string) {
      const normalizedSourceId = sourceId.trim();
      if (!normalizedSourceId) {
        return;
      }

      const bridgeClient = await getBridgeClient();
      const response = await bridgeClient.invoke("uninstall", {
        sourceIds: [normalizedSourceId],
      });
      expectOptionalOkRecord(response, "uninstall");
    },
  };
}

function applyInventoryList(state: DesktopAppState, response: DesktopBridgeResponse): void {
  if (!response.ok) {
    throw new Error(response.errors[0]?.message ?? "Unable to refresh desktop inventory.");
  }

  const data = response.data;
  if (!isRecord(data)) {
    return;
  }

  const typedData = data as DesktopInventoryListResult;
  if (Array.isArray(typedData.summaries)) {
    state.workspace.sourceIds = typedData.summaries
      .map((summary) => summary?.source?.id)
      .filter((sourceId): sourceId is string => typeof sourceId === "string" && sourceId.length > 0);
    state.workspace.inventorySummaries = typedData.summaries.flatMap((summary) =>
      toInventorySummary(summary, typedData.groupCardEnrichmentBySourceId),
    );
  }

  if (Array.isArray(typedData.pinnedSourceIds)) {
    state.workspace.pinnedSourceIds = typedData.pinnedSourceIds.filter(
      (sourceId): sourceId is string => typeof sourceId === "string" && sourceId.length > 0,
    );
  }

  if (Array.isArray(typedData.recentProjects)) {
    state.settings.recentProjectScopes = typedData.recentProjects.flatMap((project) => {
      if (
        typeof project?.projectId !== "string" ||
        typeof project.title !== "string" ||
        typeof project.lastActivityAt !== "string"
      ) {
        return [];
      }

      const nextProject: RecentProjectScopeItem = {
        projectId: project.projectId,
        title: project.title,
        lastActivityAt: project.lastActivityAt,
        tools: Array.isArray(project.tools)
          ? project.tools.filter((tool): tool is string => typeof tool === "string")
          : [],
      };
      if (typeof project.projectPath === "string") {
        nextProject.projectPath = project.projectPath;
      }
      return [nextProject];
    });
  }

  if (isProjectScopeSelection(typedData.selectedProjectScope)) {
    state.settings.selectedProjectScope = typedData.selectedProjectScope;
  }
}

function toInventorySummary(
  summary: DesktopWorkflowSummary,
  enrichmentBySourceId: DesktopInventoryListResult["groupCardEnrichmentBySourceId"],
): InventorySummaryState[] {
  const sourceId = summary.source?.id;
  const title = summary.source?.displayName;
  const locator = summary.source?.locator;
  if (typeof sourceId !== "string" || typeof title !== "string" || typeof locator !== "string") {
    return [];
  }

  const selectedLeafIds = Array.isArray(summary.bindings?.selectedLeafIds)
    ? summary.bindings?.selectedLeafIds.filter((leafId): leafId is string => typeof leafId === "string")
    : [];
  const skills = (summary.leafs ?? []).flatMap((leaf) => {
    if (typeof leaf?.id !== "string" || leaf.id.length === 0) {
      return [];
    }
    return [{
      id: leaf.id,
      title: leaf.linkName ?? leaf.title ?? leaf.name ?? leaf.id,
      isEnabled: selectedLeafIds.includes(leaf.id),
    }];
  });
  const selectedSkillNames = skills.filter((skill) => skill.isEnabled).map((skill) => skill.title);
  const targets = Object.entries(summary.bindings?.targets ?? {}).flatMap(([targetId, target]) => {
    if (!target || typeof target !== "object") {
      return [];
    }
    return [{
      id: targetId,
      label: targetLabelsById[targetId] ?? targetId,
      shortLabel: targetShortLabelsById[targetId] ?? targetLabelsById[targetId] ?? targetId,
      isEnabled: target.enabled === true,
    }];
  });
  const enabledTargetLabels = targets.filter((target) => target.isEnabled).map((target) => target.label);
  const activeTargetCount = typeof summary.activeTargetCount === "number"
    ? summary.activeTargetCount
    : Object.values(summary.bindings?.targets ?? {}).filter((target) => target?.enabled === true).length;
  const enrichment = enrichmentBySourceId?.[sourceId];
  const ownerHandle = enrichment?.sourceMetadata?.status === "ready"
    ? enrichment.sourceMetadata.data?.ownerHandle
    : undefined;
  const downloadCount = typeof enrichment?.sourceSnapshot?.totalInstalls === "number"
    ? enrichment.sourceSnapshot.totalInstalls
    : undefined;
  const starCount = typeof enrichment?.sourceSnapshot?.repoStars === "number"
    ? enrichment.sourceSnapshot.repoStars
    : typeof enrichment?.sourceMetadata?.data?.starCount === "number"
    ? enrichment.sourceMetadata.data.starCount
    : undefined;
  const repoUrl = typeof enrichment?.sourceSnapshot?.repoUrl === "string"
    ? enrichment.sourceSnapshot.repoUrl
    : undefined;
  const groupPath = typeof enrichment?.groupPath === "string" ? enrichment.groupPath : undefined;

  return [{
    sourceId,
    title,
    locator,
    health: typeof summary.health === "string" ? summary.health : "HEALTHY",
    warningCount: typeof summary.issueCounts?.warning === "number" ? summary.issueCounts.warning : 0,
    errorCount: typeof summary.issueCounts?.error === "number" ? summary.issueCounts.error : 0,
    skillCount: skills.length,
    enabledSkillCount: selectedLeafIds.length,
    activeTargetCount,
    skillSelection: toSelectionState(selectedLeafIds.length, skills.length),
    targetSelection: toSelectionState(enabledTargetLabels.length, targets.length),
    ...(skills.length > 0 ? { skills } : {}),
    ...(targets.length > 0 ? { targets } : {}),
    ...(downloadCount !== undefined ? { downloadCount } : {}),
    ...(starCount !== undefined ? { starCount } : {}),
    ...(repoUrl ? { repoUrl } : {}),
    ...(groupPath ? { groupPath } : {}),
    ...(enabledTargetLabels.length > 0 ? { enabledTargetLabels } : {}),
    ...(selectedSkillNames.length > 0 ? { selectedSkillNames } : {}),
    ...(ownerHandle ? { byline: `by ${ownerHandle}` } : {}),
  }];
}

function toDetailRecord(
  sourceId: string,
  inspectResponse: DesktopBridgeResponse,
  enrichmentResponse: DesktopBridgeResponse,
): DetailRecord {
  const inspectData = expectOkRecord(inspectResponse, "inspect") as DesktopInspectResult;
  const enrichmentData = expectOptionalOkRecord(enrichmentResponse, "inspect-enrichment") as DesktopInspectEnrichmentResult | undefined;
  const summary = inspectData.summary;
  const source = inspectData.source;
  const binding = inspectData.binding;
  const leafs = Array.isArray(inspectData.leafs) ? inspectData.leafs : [];
  const deployments = Array.isArray(inspectData.deployments) ? inspectData.deployments : [];
  const selectedLeafIds = Array.isArray(binding?.selectedLeafIds)
    ? binding.selectedLeafIds.filter((leafId): leafId is string => typeof leafId === "string" && leafId.length > 0)
    : [];
  const targets = toDetailTargets(binding?.targets);
  const enabledTargetLabels = targets.filter((target) => target.isEnabled).map((target) => target.label ?? target.id);
  const skills = toDetailSkills(leafs, selectedLeafIds);
  const sourceFacts = toSourceFacts(summary, source, enrichmentData);
  const deploymentFacts = deployments.flatMap((deployment) => {
    if (typeof deployment?.target !== "string") {
      return [];
    }
    const targetLabel = targetLabelsById[deployment.target] ?? deployment.target;
    const targetPath = typeof deployment.targetPath === "string"
      ? deployment.targetPath
      : typeof deployment.targetRootPath === "string"
      ? deployment.targetRootPath
      : undefined;
    return [targetPath ? `${targetLabel} -> ${targetPath}` : targetLabel];
  });
  const revision = summary?.lock?.resolvedVersion ?? summary?.lock?.commitSha;
  const author = enrichmentData?.sourceMetadata?.status === "ready"
    ? enrichmentData.sourceMetadata.data?.ownerDisplayName ?? enrichmentData.sourceMetadata.data?.ownerHandle
    : undefined;
  const starCount = typeof enrichmentData?.sourceSnapshot?.repoStars === "number"
    ? enrichmentData.sourceSnapshot.repoStars
    : enrichmentData?.sourceMetadata?.status === "ready"
    ? enrichmentData.sourceMetadata.data?.starCount
    : undefined;
  const downloadCount = typeof enrichmentData?.sourceSnapshot?.totalInstalls === "number"
    ? enrichmentData.sourceSnapshot.totalInstalls
    : undefined;
  const repoUrl = typeof enrichmentData?.sourceSnapshot?.repoUrl === "string"
    ? enrichmentData.sourceSnapshot.repoUrl
    : undefined;
  const locator = source?.locator ?? summary?.source?.locator;

  return {
    sourceId,
    title: source?.displayName ?? summary?.source?.displayName ?? sourceId,
    ...(revision ? { revision } : {}),
    ...(typeof source?.kind === "string" ? { subtitle: source.kind } : {}),
    ...(author ? { author } : {}),
    ...(downloadCount !== undefined ? { downloadCount } : {}),
    ...(starCount !== undefined ? { starCount } : {}),
    ...(repoUrl ? { repoUrl } : {}),
    ...(locator ? { locator } : {}),
    ...(summary?.lock?.checkoutPath ? { groupPath: summary.lock.checkoutPath } : {}),
    ...(summary?.lock?.updatedAt ? { updatedAt: summary.lock.updatedAt } : {}),
    health: typeof summary?.health === "string" ? summary.health : "HEALTHY",
    warningCount: typeof summary?.issueCounts?.warning === "number" ? summary.issueCounts.warning : 0,
    errorCount: typeof summary?.issueCounts?.error === "number" ? summary.issueCounts.error : 0,
    enabledSkillCount: selectedLeafIds.length,
    totalSkillCount: skills.length,
    enabledTargetCount: enabledTargetLabels.length,
    skillSelection: toSelectionState(selectedLeafIds.length, skills.length),
    targetSelection: toSelectionState(enabledTargetLabels.length, targets.length),
    enabledTargetLabels,
    sourceFacts,
    deploymentFacts,
    fileTree: Array.isArray(inspectData.fileTree) ? inspectData.fileTree : toDetailFileTree(leafs),
    groupDocuments: Array.isArray(inspectData.groupDocuments)
      ? inspectData.groupDocuments
      : toGroupDocuments(sourceId, source, summary, enrichmentData),
    targets,
    skills,
  };
}

function toDetailTargets(
  targets: Record<string, { enabled?: boolean; leafIds?: string[] }> | undefined,
): DetailTargetState[] {
  return Object.entries(targets ?? {}).flatMap(([targetId, targetState]) => {
    if (!targetState || typeof targetState !== "object") {
      return [];
    }

    return [{
      id: targetId,
      label: targetLabelsById[targetId] ?? targetId,
      shortLabel: targetLabelsById[targetId] ?? targetId,
      isEnabled: targetState.enabled === true,
    }];
  });
}

function toDetailSkills(
  leafs: DesktopInspectResult["leafs"],
  selectedLeafIds: string[],
): DetailSkillState[] {
  return (leafs ?? []).flatMap((leaf) => {
    if (typeof leaf?.id !== "string" || leaf.id.length === 0) {
      return [];
    }

    const title = typeof leaf.title === "string" && leaf.title.length > 0
      ? leaf.title
      : typeof leaf.name === "string" && leaf.name.length > 0
      ? leaf.name
      : leaf.linkName ?? leaf.id;

    return [{
      id: leaf.id,
      title,
      isEnabled: selectedLeafIds.includes(leaf.id),
      documents: toSkillDocuments(leaf),
    }];
  });
}

function toSkillDocuments(
  leaf: NonNullable<DesktopInspectResult["leafs"]>[number],
): DetailDocumentTab[] {
  if (Array.isArray(leaf.documents)) {
    return leaf.documents;
  }

  const documentPath = typeof leaf.skillFilePath === "string" && leaf.skillFilePath.length > 0
    ? leaf.skillFilePath
    : typeof leaf.relativePath === "string" && leaf.relativePath.length > 0
    ? leaf.relativePath
    : undefined;
  if (!documentPath) {
    return [];
  }

  return [{
    id: `${leaf.id}:skill-doc`,
    title: documentPath.split("/").pop() ?? "SKILL.md",
    path: documentPath,
    metadata: [],
    renderCacheKey: `${leaf.id}:${documentPath}`,
    content: typeof leaf.documentContent === "string" && leaf.documentContent.length > 0
      ? leaf.documentContent
      : typeof leaf.description === "string" && leaf.description.length > 0
      ? leaf.description
      : "No detail content loaded yet.",
    isLoaded: true,
  }];
}

function toGroupDocuments(
  sourceId: string,
  source: DesktopInspectResult["source"],
  summary: DesktopInspectResult["summary"],
  enrichment: DesktopInspectEnrichmentResult | undefined,
): DetailDocumentTab[] {
  const groupPath = summary?.lock?.checkoutPath ?? ".";
  const documents: DetailDocumentTab[] = [{
    id: "group:filetree",
    title: "File Tree",
    path: groupPath,
    metadata: [],
    renderCacheKey: `group:filetree:${sourceId}:${groupPath}`,
    content: "",
    isLoaded: true,
  }];
  const contentLines = [
    source?.displayName ?? summary?.source?.displayName ?? sourceId,
    typeof enrichment?.sourceSnapshot?.summary === "string" ? enrichment.sourceSnapshot.summary : undefined,
    enrichment?.sourceMetadata?.status === "ready"
      ? enrichment.sourceMetadata.data?.description
      : undefined,
    typeof source?.locator === "string" ? source.locator : undefined,
  ].filter((line): line is string => typeof line === "string" && line.length > 0);

  if (contentLines.length === 0) {
    return documents;
  }

  documents.push({
    id: `${sourceId}:overview`,
    title: "README.md",
    path: "README.md",
    metadata: [],
    renderCacheKey: `${sourceId}:overview`,
    content: contentLines.join("\n\n"),
    isLoaded: true,
  });
  return documents;
}

function toDetailFileTree(
  leafs: DesktopInspectResult["leafs"],
): DetailFileTreeItem[] {
  return (leafs ?? []).flatMap((leaf) => {
    if (typeof leaf?.id !== "string" || leaf.id.length === 0) {
      return [];
    }

    const title = typeof leaf.linkName === "string" && leaf.linkName.length > 0
      ? leaf.linkName
      : typeof leaf.name === "string" && leaf.name.length > 0
      ? leaf.name
      : leaf.id;
    return [{
      id: leaf.id,
      title,
      path: typeof leaf.relativePath === "string" ? leaf.relativePath : title,
      isDirectory: true,
      isSkillRoot: true,
      isSkillDocument: false,
      skillId: leaf.id,
      children: [],
    }];
  });
}

function toSourceFacts(
  summary: DesktopInspectResult["summary"],
  source: DesktopInspectResult["source"],
  enrichment: DesktopInspectEnrichmentResult | undefined,
): string[] {
  const facts = [
    typeof source?.locator === "string" && source.locator.length > 0 ? source.locator : undefined,
    typeof summary?.lock?.checkoutPath === "string" && summary.lock.checkoutPath.length > 0
      ? summary.lock.checkoutPath
      : undefined,
    typeof enrichment?.sourceSnapshot?.repoLabel === "string" && enrichment.sourceSnapshot.repoLabel.length > 0
      ? enrichment.sourceSnapshot.repoLabel
      : undefined,
    typeof enrichment?.sourceSnapshot?.summary === "string" && enrichment.sourceSnapshot.summary.length > 0
      ? enrichment.sourceSnapshot.summary
      : undefined,
    enrichment?.sourceMetadata?.status === "ready"
      && typeof enrichment.sourceMetadata.data?.description === "string"
      && enrichment.sourceMetadata.data.description.length > 0
      ? enrichment.sourceMetadata.data.description
      : undefined,
  ];

  return facts.filter((fact): fact is string => typeof fact === "string");
}

function toSelectionState(enabledCount: number, totalCount: number): DetailRecord["skillSelection"] {
  if (totalCount === 0 || enabledCount === 0) {
    return "empty";
  }
  if (enabledCount >= totalCount) {
    return "full";
  }
  return "partial";
}

function toImportGroups(data: DesktopImportSearchResult): ImportGroupState[] {
  return (data.groups ?? []).flatMap((group) => {
    const id = stringValue(group.id);
    const title = stringValue(group.title);
    const locator = stringValue(group.locator);
    if (!id || !title || !locator) {
      return [];
    }
    const canonicalRepo = stringValue(group.canonicalRepo) ?? stringValue(group.snapshot?.canonicalRepo);
    const repoUrl = stringValue(group.snapshot?.repoUrl) ?? stringValue(group.repoUrl);
    const starCount = numberValue(group.snapshot?.repoStars) ?? numberValue(group.starCount);
    const downloadCount = numberValue(group.snapshot?.totalInstalls) ?? numberValue(group.totalInstalls);
    const skillCount = numberValue(group.snapshot?.skillCount) ?? numberValue(group.skillCount);

    const skills = (group.snapshot?.skills ?? []).flatMap((skill) => {
      const skillId = stringValue(skill.skillId);
      if (!skillId) {
        return [];
      }
      const title = stringValue(skill.title);
      return [{
        id: skillId,
        ...(title ? { title } : {}),
        selectedByDefault: true,
      }];
    });
    const previewPhase = skills.length > 0
      ? { kind: "ready" as const }
      : toResourcePhase(group.previewState);

    return [{
      id,
      title,
      locator,
      ...(canonicalRepo ? { canonicalRepo } : {}),
      previewPhase,
      skills,
      targets: [],
      ...(skillCount !== undefined ? { skillCount } : {}),
      ...(downloadCount !== undefined ? { downloadCount } : {}),
      ...(starCount !== undefined ? { starCount } : {}),
      ...(repoUrl ? { repoUrl } : {}),
      ...(group.installed === true ? { isInstalledLocally: true } : {}),
    }];
  });
}

function toImportPreview(data: DesktopImportPreviewResult): { skills: ImportSkillState[]; targets: ImportTargetState[] } {
  if (data.status !== "ready") {
    throw new Error(data.reasonCode ?? "unknown");
  }

  const selectedSkillIds = new Set(data.selectedSkillIds?.filter((id): id is string => typeof id === "string") ?? []);
  const enabledTargets = new Set(data.enabledTargets?.filter((id): id is string => typeof id === "string") ?? []);

  return {
    skills: (data.skills ?? []).flatMap((skill) => {
      const id = stringValue(skill.id);
      if (!id) {
        return [];
      }
      const title = stringValue(skill.title);
      const summary = stringValue(skill.summary);
      return [{
        id,
        ...(title ? { title } : {}),
        ...(summary ? { summary } : {}),
        selectedByDefault: selectedSkillIds.has(id),
      }];
    }),
    targets: (data.targets ?? []).flatMap((target) => {
      const id = stringValue(target.id);
      if (!id) {
        return [];
      }
      return [{ id, selectedByDefault: enabledTargets.has(id) }];
    }),
  };
}

function toResourcePhase(value: DesktopImportPreviewState | undefined): ImportGroupState["previewPhase"] {
  if (!isRecord(value) || typeof value.status !== "string") {
    return { kind: "idle" };
  }
  if (value.status === "loading" || value.status === "ready") {
    return { kind: value.status };
  }
  if (value.status === "failed") {
    return { kind: "failed", message: stringValue(value.reasonCode) ?? "unknown" };
  }
  return { kind: "idle" };
}

function expectOkRecord(response: DesktopBridgeResponse, command: string): Record<string, unknown> {
  if (!response.ok) {
    throw new Error(response.errors[0]?.message ?? `Unable to ${command}.`);
  }
  if (!isRecord(response.data)) {
    throw new Error(`Desktop bridge ${command} response must be an object.`);
  }
  return response.data;
}

function expectOptionalOkRecord(
  response: DesktopBridgeResponse,
  command: string,
): Record<string, unknown> | undefined {
  if (!response.ok) {
    throw new Error(response.errors[0]?.message ?? `Unable to ${command}.`);
  }
  if (response.data === undefined) {
    return undefined;
  }
  if (!isRecord(response.data)) {
    throw new Error(`Desktop bridge ${command} response must be an object.`);
  }
  return response.data;
}

function toBridgeProjectScope(scope: ProjectScopeSelection): { kind: "global" } | { kind: "project"; projectId: string } {
  if (scope.kind === "project") {
    return { kind: "project", projectId: scope.projectId };
  }
  return { kind: "global" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isProjectScopeSelection(value: unknown): value is ProjectScopeSelection {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }

  if (value.kind === "global") {
    return true;
  }

  return value.kind === "project" && typeof value.projectId === "string";
}

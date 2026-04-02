import type { DesktopBridgeClient } from "../bridge/client";
import type { DesktopBridgeResponse } from "../bridge/types";
import type { DesktopAppState } from "../store/desktop-app-state";
import type { ProjectScopeSelection, RecentProjectScopeItem } from "../store/settings-state";
import type { InventorySummaryState } from "../store/workspace-state";

export type DesktopIntegration = {
  refreshInventory(): Promise<void>;
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
  leafs?: Array<{ id?: string }>;
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
      };
    };
  }>;
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
  const activeTargetCount = typeof summary.activeTargetCount === "number"
    ? summary.activeTargetCount
    : Object.values(summary.bindings?.targets ?? {}).filter((target) => target?.enabled === true).length;
  const enrichment = enrichmentBySourceId?.[sourceId];
  const ownerHandle = enrichment?.sourceMetadata?.status === "ready"
    ? enrichment.sourceMetadata.data?.ownerHandle
    : undefined;

  return [{
    sourceId,
    title,
    locator,
    health: typeof summary.health === "string" ? summary.health : "HEALTHY",
    warningCount: typeof summary.issueCounts?.warning === "number" ? summary.issueCounts.warning : 0,
    errorCount: typeof summary.issueCounts?.error === "number" ? summary.issueCounts.error : 0,
    skillCount: Array.isArray(summary.leafs) ? summary.leafs.length : 0,
    enabledSkillCount: selectedLeafIds.length,
    activeTargetCount,
    ...(ownerHandle ? { byline: `by ${ownerHandle}` } : {}),
  }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

import { startTransition, useEffect, type CSSProperties } from "react";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { EmptyState } from "../components/empty-state";
import { SharedGroupCard, type GroupCardDisplayMode } from "../components/shared-group-card";
import { localize } from "../i18n";
import type { ImportGroupState, ImportTargetState } from "../store/import-state";
import type { InventorySelectionState, InventorySummaryState } from "../store/workspace-state";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const content = viewModel.content;
  const autoPreviewIds = previewGroupIds(groupsForContent(content));
  const autoPreviewKey = autoPreviewTaskKey(autoPreviewIds, viewModel.importSubmittedQuery);

  useEffect(() => {
    startTransition(() => {
      void viewModel.loadImportPageIfNeeded();
    });
  }, [viewModel]);

  useEffect(() => {
    if (autoPreviewIds.length === 0) {
      return;
    }
    startTransition(() => {
      for (const groupId of autoPreviewIds) {
        void viewModel.previewImportGroupIfNeeded(groupId);
      }
    });
  }, [autoPreviewKey, viewModel]);

  const hasDisplayedGroups = content.kind === "recommended"
    ? content.sections.some((section) => section.groups.length > 0)
    : content.groups.length > 0;
  const topBar = (
    <DesktopTopBar
      routeKind="importPage"
      desktopLanguage={viewModel.desktopLanguage}
      themeMode={viewModel.themeMode}
      themeAccent={viewModel.themeAccent}
      title={t("page.import.title")}
      searchValue=""
      importSearch={{
        value: viewModel.importSearchText,
        placeholder: viewModel.importPlaceholderText,
        phaseKind: viewModel.searchPhase.kind,
        resultCount: content.kind === "searchResults" ? content.groups.length : 0,
        submittedQuery: viewModel.importSubmittedQuery,
        onChange: (query) => {
          viewModel.setSearchText(query);
        },
        onSubmit: () => {
          startTransition(() => {
            void viewModel.submitSearch(viewModel.importSearchText);
          });
        },
      }}
      onSearchChange={() => undefined}
      onBack={() => {
        viewModel.showHome();
      }}
      onImport={() => undefined}
      onUpdate={() => undefined}
      onSettings={() => undefined}
    />
  );

  if (content.kind === "searchResults" && !hasDisplayedGroups && viewModel.searchPhase.kind === "failed") {
    return (
      <main data-view="import-page" style={pageStyle}>
        {topBar}
        <section data-view="import-centered-state" style={centeredStateStyle}>
          <EmptyState
            title={t("import.failed.title")}
            subtitle={viewModel.failedSearchMessage ?? t("page.import.empty_search")}
          />
        </section>
      </main>
    );
  }

  if (!hasDisplayedGroups) {
    return (
      <main data-view="import-page" style={pageStyle}>
        {topBar}
        <section data-view="import-centered-state" style={centeredStateStyle}>
          {viewModel.searchPhase.kind === "loading" ? (
            <div data-view="import-loading-indicator" style={loadingIndicatorStyle}>
              <span aria-hidden="true" style={loadingSpinnerStyle(viewModel.themeAccent)} />
              <span>{t("common.loading.groups")}</span>
            </div>
          ) : (
            <EmptyState
              title={t("home.empty.title")}
              subtitle={viewModel.importSubmittedQuery ? t("import.empty.search") : t("import.empty.recommended")}
            />
          )}
        </section>
      </main>
    );
  }

  return (
    <main data-view="import-page" style={pageStyle}>
      {topBar}
      {content.kind === "recommended" ? (
        <section data-view="recommendation-rails" style={contentColumnStyle}>
          {content.sections.map((section) => (
            <section key={section.categoryId} style={{ display: "grid", gap: "10px" }}>
              <h3 style={railTitleStyle}># {section.title}</h3>
              <div data-view="import-rail" style={railStyle}>
                {section.groups.map((group) => {
                  return (
                    <div key={group.id} style={railCardStyle}>
                      {renderImportGroupCard(group, viewModel, t, "importRecommendation")}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <section data-view="import-search-results" style={contentColumnStyle}>
          <div data-view="import-search-grid" style={searchGridStyle}>
            {content.groups.map((group) => (
              <div key={group.id}>
                {renderImportGroupCard(group, viewModel, t, "importSearch")}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

type ImportContent =
  | { kind: "recommended"; sections: Array<{ groups: ImportGroupState[] }> }
  | { kind: "searchResults"; groups: ImportGroupState[] };

export function previewGroupIds(groups: ImportGroupState[]): string[] {
  return groups
    .filter((group) => group.previewPhase.kind === "idle")
    .map((group) => group.id);
}

export function autoPreviewTaskKey(groupIds: string[], submittedQuery: string): string {
  return [submittedQuery, ...groupIds].join("|");
}

function groupsForContent(content: ImportContent): ImportGroupState[] {
  return content.kind === "recommended"
    ? content.sections.flatMap((section) => section.groups)
    : content.groups;
}

function renderImportGroupCard(
  group: ImportGroupState,
  viewModel: ImportViewModel,
  t: (key: string) => string,
  displayMode: GroupCardDisplayMode,
) {
  const draft = viewModel.draftForGroup(group.id) ?? {
    selectedSkillIds: group.skills.map((skill) => skill.id),
    enabledTargetIds: [],
  };
  const targets = viewModel.targetsForGroup(group.id);
  const selectedSkillIds = new Set(draft.selectedSkillIds);
  const enabledTargetIds = new Set(draft.enabledTargetIds);
  const card = importGroupCardModel(group, draft, targets, viewModel);

  return (
    <SharedGroupCard
      card={card}
      themeMode={viewModel.themeMode}
      themeAccent={viewModel.themeAccent}
      pinned={false}
      displayMode={displayMode}
      skillsCollapsed={false}
      isUpdating={viewModel.isImportingGroup(group.id)}
      actionButtonTitle={group.isInstalledLocally ? t("group_card.action.installed") : undefined}
      actionButtonIcon="import"
      isActionButtonDisabled={Boolean(group.isInstalledLocally)}
      onActionButton={() => {
        startTransition(() => {
          void viewModel.importGroup(group.id);
        });
      }}
      onUpdate={() => undefined}
      onTogglePinned={() => undefined}
      onDelete={() => undefined}
      onToggleSkill={(skillId) => {
        viewModel.setSkillEnabled(group.id, skillId, !selectedSkillIds.has(skillId));
      }}
      onToggleAllSkills={() => {
        viewModel.toggleAllSkills(group.id);
      }}
      onToggleTarget={(targetId) => {
        viewModel.setTargetEnabled(group.id, targetId, !enabledTargetIds.has(targetId));
      }}
      onToggleAllTargets={() => {
        viewModel.toggleAllTargets(group.id);
      }}
      onOpenRepository={(url) => {
        startTransition(() => {
          void viewModel.openRepositoryUrl(url);
        });
      }}
      groupTagItems={[]}
      groupTagSuggestions={[]}
      canCreateGroupTag={false}
      canDeleteGroupTags={false}
      onCreateGroupTag={() => undefined}
      onDeleteGroupTag={() => undefined}
      onSelectGroupTag={() => undefined}
      recommendationBadgeItems={group.recommendationBadgeItems ?? []}
      recommendationDescription={displayMode === "importRecommendation" ? group.recommendationDescription : undefined}
      labels={{
        update: t("action.update"),
        delete: t("action.delete"),
        all: t("action.all"),
        pin: t("action.pin"),
        unpin: t("action.unpin"),
        pinned: t("state.pinned"),
        import: t("action.import"),
        updating: t("group_card.loading.downloading"),
        agents: t("common.section.agents"),
        skills: t("common.section.skills"),
        tags: t("common.section.tags"),
        addTag: t("group_tag.action.add"),
        editTags: t("group_card.action.edit_tags"),
        cancelEditTags: t("group_card.action.cancel_edit_tags"),
        deleteTags: t("group_card.action.delete_tags"),
        doneDeleteTags: t("group_card.action.done_delete_tags"),
        tagPlaceholder: t("group_tag.input.placeholder"),
        activeTargets: (count) => `${count} active targets`,
        enabledSkills: (enabledCount, totalCount) => `${enabledCount} / ${totalCount} skills`,
      }}
    />
  );
}

function importGroupCardModel(
  group: ImportGroupState,
  draft: { selectedSkillIds: string[]; enabledTargetIds: string[] },
  targets: ImportTargetState[],
  viewModel: ImportViewModel,
): InventorySummaryState {
  const selectedSkillIds = new Set(draft.selectedSkillIds);
  const enabledTargetIds = new Set(draft.enabledTargetIds);
  const selectedSkillCount = group.skills.filter((skill) => selectedSkillIds.has(skill.id)).length;
  const enabledTargetCount = targets.filter((target) => enabledTargetIds.has(target.id)).length;

  const card: InventorySummaryState = {
    sourceId: group.id,
    title: group.title || group.id,
    locator: group.locator,
    byline: group.locator,
    health: "DISCOVER",
    warningCount: 0,
    errorCount: 0,
    skillCount: group.skillCount ?? group.skills.length,
    enabledSkillCount: selectedSkillCount,
    activeTargetCount: enabledTargetCount,
    skillsLoading: group.previewPhase.kind === "loading",
    targetsLoading: false,
    skillSelection: selectionState(group.skills.map((skill) => skill.id), draft.selectedSkillIds),
    targetSelection: selectionState(targets.map((target) => target.id), draft.enabledTargetIds),
    skills: group.skills.map((skill) => ({
      id: skill.id,
      title: skill.title ?? skill.id,
      isEnabled: selectedSkillIds.has(skill.id),
    })),
    targets: targets.map((target) => ({
      id: target.id,
      label: viewModel.targetLabel(target.id),
      shortLabel: viewModel.targetShortLabel(target.id),
      isEnabled: enabledTargetIds.has(target.id),
    })),
  };
  if (group.downloadCount !== undefined) {
    card.downloadCount = group.downloadCount;
  }
  if (group.starCount !== undefined) {
    card.starCount = group.starCount;
  }
  if (group.repoUrl) {
    card.repoUrl = group.repoUrl;
  }
  return card;
}

function selectionState(allIds: string[], selectedIds: string[]): InventorySelectionState {
  if (allIds.length === 0) {
    return "empty";
  }
  const selected = new Set(selectedIds);
  const selectedCount = allIds.filter((id) => selected.has(id)).length;
  if (selectedCount === 0) {
    return "empty";
  }
  return selectedCount === allIds.length ? "full" : "partial";
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: 0,
  background: "#f2f2f2",
};

const contentColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: "0 20px 20px",
};

const centeredStateStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "420px",
  padding: "0 20px 20px",
};

const loadingIndicatorStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "220px",
  color: "#525252",
  fontSize: "12px",
  fontWeight: 500,
};

const loadingSpinnerStyle = (accent: string): CSSProperties => ({
  width: "16px",
  height: "16px",
  borderRadius: "999px",
  border: "2px solid rgba(115, 115, 115, 0.28)",
  borderTopColor: accent === "green" ? "#22c55e" : accent === "orange" ? "#f97316" : "#3b82f6",
});

const railTitleStyle: CSSProperties = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "28px",
  width: "fit-content",
  padding: "0 10px",
  borderRadius: "8px",
  background: "rgba(219, 234, 254, 0.85)",
  color: "#0c4a6e",
  fontSize: "13px",
  fontWeight: 600,
};

const railStyle: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "304px",
  gap: "14px",
  overflowX: "auto",
  paddingBottom: "4px",
};

const railCardStyle: CSSProperties = {
  width: "304px",
};

const searchGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
  alignItems: "start",
};

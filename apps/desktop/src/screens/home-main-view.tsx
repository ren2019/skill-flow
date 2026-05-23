import { startTransition, type CSSProperties, type MouseEvent } from "react";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { SharedGroupCard } from "../components/shared-group-card";
import { resolveActionIcon } from "../icons/action-icons";
import { localize } from "../i18n";
import { desktopTheme } from "../theme/app-theme";
import { HomeViewModel } from "../view-models/home-view-model";
import type { GroupCardDisplayMode } from "../components/shared-group-card";

type HomeMainViewProps = {
  viewModel: HomeViewModel;
};

export function HomeMainView({ viewModel }: HomeMainViewProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const visibleCards = viewModel.inventoryCards;
  const hasVisibleCards = visibleCards.length > 0;
  const cardDisplayMode = homeGroupCardDisplayMode(viewModel.homeCardDensity);

  return (
    <main data-view="home-page" style={pageStyle}>
      <DesktopTopBar
        routeKind={viewModel.currentRoute.kind}
        desktopLanguage={viewModel.desktopLanguage}
        themeMode={viewModel.themeMode}
        themeAccent={viewModel.themeAccent}
        searchValue={viewModel.searchQuery}
        showsProjectScopeBar={viewModel.showsProjectScopeBar}
        onSearchChange={(value) => {
          viewModel.searchQuery = value;
        }}
        onToggleProjectScope={() => {
          viewModel.toggleProjectScopeBar();
        }}
        onImport={() => {
          viewModel.showImportPage();
        }}
        onUpdate={() => {
          startTransition(() => {
            void viewModel.updateAllGroupsFromHome();
          });
        }}
        onSettings={() => {
          viewModel.showSettings();
        }}
      />
      <section data-view="home-content" style={contentStyle}>
        {viewModel.toastMessage ? (
          <div data-view="home-toast-banner" role="status" style={toastStyle}>
            {viewModel.toastMessage}
          </div>
        ) : null}
        <section data-view="home-grid-section" style={gridSectionStyle}>
          {hasVisibleCards && viewModel.showsProjectScopeBar ? (
            <section data-view="home-project-scope-bar" style={scopeBarStyle}>
              <button
                type="button"
                data-project-scope="global"
                onClick={() => {
                  startTransition(() => {
                    void viewModel.selectProjectScope({ kind: "global" });
                  });
                }}
                style={projectScopeButtonStyle(
                  viewModel.selectedProjectScope.kind === "global",
                  true,
                )}
              >
                <span style={projectScopeContentStyle(true)}>
                  {viewModel.selectedProjectScope.kind === "global" ? (
                    <span aria-hidden="true" style={projectScopeIndicatorStyle(viewModel.themeAccent)} />
                  ) : null}
                  <span>{t("project_scope.global")}</span>
                </span>
              </button>
              <div data-view="home-filter-divider" style={filterDividerStyle(viewModel.themeMode)} />
              <div style={horizontalScrollerStyle}>
                {viewModel.recentProjectScopes.map((scope) => (
                  <span key={scope.projectId} style={projectScopeShellStyle}>
                    <button
                      type="button"
                      data-project-scope={`project:${scope.projectId}`}
                      onClick={() => {
                        stateTransition(() =>
                          viewModel.selectProjectScope({ kind: "project", projectId: scope.projectId }),
                        );
                      }}
                      style={projectScopeButtonStyle(
                        viewModel.selectedProjectScope.kind === "project"
                        && viewModel.selectedProjectScope.projectId === scope.projectId,
                        false,
                        Boolean(scope.projectPath),
                      )}
                    >
                      <span style={projectScopeContentStyle(false, Boolean(scope.projectPath))}>
                        {viewModel.selectedProjectScope.kind === "project"
                        && viewModel.selectedProjectScope.projectId === scope.projectId ? (
                          <span aria-hidden="true" style={projectScopeIndicatorStyle(viewModel.themeAccent)} />
                          ) : null}
                        <span>{scope.title}</span>
                      </span>
                    </button>
                    {scope.projectPath ? (
                      <button
                        type="button"
                        data-project-scope-path={scope.projectPath}
                        aria-label={scope.projectPath}
                        title={scope.projectPath}
                        onClick={(event) => {
                          stopClick(event);
                          stateTransition(() => viewModel.openCardPath(scope.projectPath ?? ""));
                        }}
                        style={projectScopePathButtonStyle}
                      >
                        <img src={resolveActionIcon("external-link")} alt="" aria-hidden="true" style={projectScopePathIconStyle} />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {hasVisibleCards && viewModel.homeTagFilters.length > 0 ? (
            <section data-view="home-tag-filter-bar" style={tagFilterBarStyle}>
              <button
                type="button"
                data-home-tag-filter="all"
                onClick={() => {
                  viewModel.selectHomeTagFilter(undefined);
                }}
                style={tagFilterPillStyle(!viewModel.selectedHomeTagFilterId, viewModel.themeAccent, true)}
              >
                #{t("group_tag.filter.all")}
              </button>
              <div data-view="home-filter-divider" style={filterDividerStyle(viewModel.themeMode)} />
              <div style={horizontalScrollerStyle}>
              {viewModel.homeTagFilters.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  data-home-tag-filter={tag.id}
                  onClick={() => {
                    viewModel.selectHomeTagFilter(tag.id);
                  }}
                  style={tagFilterPillStyle(
                    viewModel.selectedHomeTagFilterId === tag.id,
                    tag.accent ?? viewModel.themeAccent,
                  )}
                >
                  #{tag.title}
                  {viewModel.homeTagCountById[tag.id] ? (
                    <span style={tagCountStyle}>{viewModel.homeTagCountById[tag.id]}</span>
                  ) : null}
                </button>
              ))}
              </div>
            </section>
          ) : null}

          {viewModel.homeBootstrapPhase.kind === "loading" ? (
            <div data-view="home-loading-state" style={loadingStateStyle}>
              <div aria-hidden="true" style={spinnerStyle} />
              <span>{t("common.loading.groups")}</span>
            </div>
          ) : viewModel.homeBootstrapPhase.kind === "failed" ? (
            <div data-view="home-empty-state" style={emptyStateStyle}>
              {viewModel.homeBootstrapPhase.message}
            </div>
          ) : !hasVisibleCards ? (
            <div data-view="home-empty-state" style={emptyStateStyle}>
              <h2 style={emptyStateTitleStyle}>{t("home.empty.title")}</h2>
              <p style={emptyStateSubtitleStyle}>{t("home.empty.subtitle")}</p>
            </div>
          ) : (
            <section data-view="home-card-grid" style={inventoryGridStyle}>
              {visibleCards.map((card) => (
                <SharedGroupCard
                  key={card.sourceId}
                  card={card}
                  themeMode={viewModel.themeMode}
                  themeAccent={viewModel.themeAccent}
                  pinned={viewModel.isPinned(card.sourceId)}
                  displayMode={cardDisplayMode}
                  isUpdating={viewModel.isUpdatingSource(card.sourceId)}
                  onOpen={() => {
                    viewModel.openDetail(card.sourceId);
                  }}
                  onUpdate={() => {
                    stateTransition(() => viewModel.updateSource(card.sourceId));
                  }}
                  onTogglePinned={() => {
                    stateTransition(() => viewModel.togglePinned(card.sourceId));
                  }}
                  onDelete={() => {
                    stateTransition(() => viewModel.deleteSource(card.sourceId));
                  }}
                  onToggleSkill={(skillId) => {
                    stateTransition(() => viewModel.toggleCardSkill(card.sourceId, skillId));
                  }}
                  onToggleAllSkills={() => {
                    stateTransition(() => viewModel.toggleAllCardSkills(card.sourceId));
                  }}
                  onToggleTarget={(targetId) => {
                    stateTransition(() => viewModel.toggleCardTarget(card.sourceId, targetId));
                  }}
                  onToggleAllTargets={() => {
                    stateTransition(() => viewModel.toggleAllCardTargets(card.sourceId));
                  }}
                  onOpenRepository={(url) => {
                    stateTransition(() => viewModel.openCardRepository(url));
                  }}
                  onOpenLocalPath={(path) => {
                    stateTransition(() => viewModel.openCardPath(path));
                  }}
                  groupTagItems={viewModel.inventoryTags(card.sourceId)}
                  groupTagSuggestions={viewModel.tagSuggestions(card.sourceId)}
                  canCreateGroupTag={viewModel.canCreateGroupTag(card.sourceId)}
                  canDeleteGroupTags={viewModel.canDeleteGroupTags(card.sourceId)}
                  onCreateGroupTag={(title, accent) => {
                    viewModel.addCustomTag(card.sourceId, title, accent);
                  }}
                  onDeleteGroupTag={(tagId) => {
                    viewModel.removeCustomTag(card.sourceId, tagId);
                  }}
                  onSelectGroupTag={(tagId) => {
                    viewModel.selectHomeTagFilter(tagId);
                  }}
                  labels={{
                    update: t("action.update"),
                    delete: t("action.delete"),
                    all: t("action.all"),
                    pin: t("action.pin"),
                    unpin: t("action.unpin"),
                    pinned: t("state.pinned"),
                    import: t("action.import"),
                    updating: t("group_card.loading.updating"),
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
              ))}
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function homeGroupCardDisplayMode(density: string): GroupCardDisplayMode {
  return density === "compact" ? "homeCompact" : "homeComfortable";
}

function stateTransition(action: () => Promise<unknown> | unknown) {
  startTransition(() => {
    void action();
  });
}

function stopClick(event: MouseEvent): void {
  event.stopPropagation();
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: desktopTheme.pageBackground("light"),
  color: desktopTheme.textPrimary("light"),
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "16px",
};

const toastStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(14, 116, 144, 0.18)",
  background: "rgba(240, 249, 255, 0.96)",
  boxShadow: "0 8px 24px rgba(14, 116, 144, 0.08)",
};

const gridSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const scopeBarStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const tagFilterBarStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const emptyStateStyle: CSSProperties = {
  minHeight: "220px",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: "6px",
  padding: "24px",
  borderRadius: "10px",
  color: "#64748b",
};

const emptyStateTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 650,
};

const emptyStateSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 400,
};

const loadingStateStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  minHeight: "220px",
  color: "#334155",
  textAlign: "center",
};

const spinnerStyle: CSSProperties = {
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  border: "2px solid rgba(148, 163, 184, 0.25)",
  borderTopColor: "#3b82f6",
};

const inventoryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "12px",
};


function projectScopeButtonStyle(active: boolean, fixedWidth = false, hasPath = false): CSSProperties {
  return {
    minWidth: fixedWidth ? "132px" : undefined,
    height: "32px",
    padding: 0,
    borderRadius: "999px",
    border: active ? "1px solid rgba(59, 130, 246, 0.35)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(59, 130, 246, 0.16)" : "rgba(255, 255, 255, 0.74)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
    boxShadow: active ? "0 8px 20px rgba(59, 130, 246, 0.12)" : undefined,
    position: "relative",
  };
}

function tagFilterPillStyle(active: boolean, accent: string, fixedWidth = false): CSSProperties {
  const brand = accentToColor(accent);
  return {
    minWidth: fixedWidth ? "132px" : undefined,
    height: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    border: "none",
    background: active ? `${brand}2e` : `${brand}24`,
    color: brand,
    opacity: active ? 1 : 0.6,
    fontSize: "12px",
    fontWeight: active ? 600 : 400,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  };
}

function filterDividerStyle(themeMode: "light" | "dark"): CSSProperties {
  return {
    width: "1px",
    height: "24px",
    background: themeMode === "light" ? "rgba(148, 163, 184, 0.24)" : "rgba(255, 255, 255, 0.16)",
    flexShrink: 0,
  };
}

const horizontalScrollerStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const projectScopeShellStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

function projectScopeContentStyle(centered = false, hasPath = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    justifyContent: centered ? "center" : "flex-start",
    width: "100%",
    padding: centered ? "0 12px" : `0 ${hasPath ? 30 : 12}px 0 12px`,
    whiteSpace: "nowrap",
  };
}

const projectScopePathButtonStyle: CSSProperties = {
  position: "absolute",
  right: "6px",
  top: "50%",
  transform: "translateY(-50%)",
  width: "18px",
  height: "18px",
  padding: 0,
  border: "none",
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const projectScopePathIconStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  opacity: 0.68,
};

function projectScopeIndicatorStyle(accent: string): CSSProperties {
  return {
    width: "6px",
    height: "6px",
    borderRadius: "999px",
    background: accentToColor(accent),
    flexShrink: 0,
  };
}

const tagCountStyle: CSSProperties = {
  fontSize: "10px",
  opacity: 0.78,
};

function accentToColor(accent: string): string {
  const map: Record<string, string> = {
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    pink: "#ec4899",
    orange: "#f97316",
    purple: "#8b5cf6",
  };
  return map[accent] ?? "#3b82f6";
}

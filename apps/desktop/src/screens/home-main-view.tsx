import { startTransition, type CSSProperties } from "react";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { SharedGroupCard } from "../components/shared-group-card";
import { localize, localizeRouteKind } from "../i18n";
import { desktopTheme } from "../theme/app-theme";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeMainViewProps = {
  viewModel: HomeViewModel;
};

export function HomeMainView({ viewModel }: HomeMainViewProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const visibleCards = viewModel.inventoryCards;

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
          {viewModel.showsProjectScopeBar ? (
            <section data-view="home-project-scope-bar" style={scopeBarStyle}>
              <button
                type="button"
                data-project-scope="global"
                onClick={() => {
                  startTransition(() => {
                    void viewModel.selectProjectScope({ kind: "global" });
                  });
                }}
                style={projectScopeButtonStyle(viewModel.selectedProjectScope.kind === "global")}
              >
                {t("project_scope.global")}
              </button>
              {viewModel.recentProjectScopes.map((scope) => (
                <button
                  key={scope.projectId}
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
                  )}
                >
                  {scope.title}
                </button>
              ))}
            </section>
          ) : null}

          {viewModel.homeTagFilters.length > 0 ? (
            <section data-view="home-tag-filter-bar" style={tagFilterBarStyle}>
              <button
                type="button"
                data-home-tag-filter="all"
                onClick={() => {
                  viewModel.selectHomeTagFilter(undefined);
                }}
                style={tagFilterPillStyle(!viewModel.selectedHomeTagFilterId)}
              >
                #All
              </button>
              {viewModel.homeTagFilters.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  data-home-tag-filter={tag.id}
                  onClick={() => {
                    viewModel.selectHomeTagFilter(tag.id);
                  }}
                  style={tagFilterPillStyle(viewModel.selectedHomeTagFilterId === tag.id)}
                >
                  #{tag.title}
                </button>
              ))}
            </section>
          ) : null}

          {viewModel.homeBootstrapPhase.kind === "loading" ? (
            <div data-view="home-loading-state" style={loadingStateStyle}>
              <div aria-hidden="true" style={spinnerStyle} />
              <span>{t("page.home.loading_workspace")}</span>
            </div>
          ) : viewModel.homeBootstrapPhase.kind === "failed" ? (
            <div data-view="home-empty-state" style={emptyStateStyle}>
              {viewModel.homeBootstrapPhase.message}
            </div>
          ) : visibleCards.length === 0 ? (
            <div data-view="home-empty-state" style={emptyStateStyle}>
              {t("page.home.empty")}
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
                  onOpen={() => {
                    viewModel.openDetail(card.sourceId);
                  }}
                  onUpdate={() => {
                    stateTransition(() => viewModel.updateSource(card.sourceId));
                  }}
                  onTogglePinned={() => {
                    viewModel.togglePinned(card.sourceId);
                  }}
                  labels={{
                    pin: t("action.pin"),
                    unpin: t("action.unpin"),
                    pinned: t("state.pinned"),
                    agents: t("common.section.agents"),
                    skills: t("common.section.skills"),
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

function stateTransition(action: () => Promise<unknown> | unknown) {
  startTransition(() => {
    void action();
  });
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
  flexWrap: "wrap",
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(15, 23, 42, 0.04)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
};

const tagFilterBarStyle: CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const emptyStateStyle: CSSProperties = {
  minHeight: "220px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  borderRadius: "14px",
  background: "rgba(248, 250, 252, 0.92)",
  color: "#64748b",
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


function actionButtonStyle(active = false): CSSProperties {
  return {
    height: "34px",
    padding: "0 12px",
    borderRadius: "10px",
    border: active ? "1px solid rgba(13, 148, 136, 0.26)" : "1px solid rgba(148, 163, 184, 0.22)",
    background: active ? "rgba(204, 251, 241, 0.88)" : "rgba(255, 255, 255, 0.9)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

function projectScopeButtonStyle(active: boolean): CSSProperties {
  return {
    height: "34px",
    padding: "0 12px",
    borderRadius: "999px",
    border: active ? "1px solid rgba(14, 116, 144, 0.35)" : "1px solid rgba(148, 163, 184, 0.2)",
    background: active ? "rgba(224, 242, 254, 0.9)" : "rgba(255, 255, 255, 0.86)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: active ? 700 : 500,
  };
}

function tagFilterPillStyle(active: boolean): CSSProperties {
  return {
    height: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    border: "none",
    background: active ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.12)",
    color: "#2563eb",
    opacity: active ? 1 : 0.6,
    fontSize: "12px",
    fontWeight: active ? 600 : 400,
  };
}

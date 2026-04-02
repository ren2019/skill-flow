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
        <section data-view="home-inventory-panel" style={panelStyle}>
          <header style={panelHeaderStyle}>
            <div style={panelTitleStyle}>
              <p style={eyebrowStyle}>{t("route.home")}</p>
              <h1 style={headingStyle}>{t("page.home.title")}</h1>
              <p style={metaTextStyle}>
                {t("page.home.current_route")}:{" "}
                {localizeRouteKind(viewModel.currentRoute.kind, viewModel.desktopLanguage)}
              </p>
            </div>
            <div data-view="home-inventory-summary" style={summaryCardStyle}>
              <strong style={{ display: "block", fontSize: "12px" }}>{t("page.home.inventory")}</strong>
              <span style={metaTextStyle}>
                {t("page.home.sources")}: {visibleCards.length}
              </span>
            </div>
          </header>

          <section data-view="home-scope-summary" style={scopeSummaryStyle}>
            <p style={metaTextStyle}>
              {t("page.home.scope")}:{" "}
              {viewModel.selectedProjectScope.kind === "project"
                ? viewModel.selectedProjectScope.projectId
                : t("project_scope.global")}
            </p>
            <nav style={actionRowStyle}>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    void viewModel.refresh();
                  });
                }}
                style={actionButtonStyle()}
              >
                {t("action.refresh")}
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    void viewModel.updateAllGroupsFromHome();
                  });
                }}
                style={actionButtonStyle()}
              >
                {t("action.update_all")}
              </button>
            </nav>
          </section>

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

          {visibleCards.length === 0 ? (
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

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "18px",
  borderRadius: "20px",
  border: `1px solid ${desktopTheme.cardBorder("light")}`,
  background: desktopTheme.surface("light"),
  boxShadow: `0 18px 40px ${desktopTheme.cardShadow("light")}`,
  backdropFilter: "blur(12px)",
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const panelTitleStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
};

const summaryCardStyle: CSSProperties = {
  minWidth: "180px",
  padding: "12px 14px",
  borderRadius: "16px",
  background: "linear-gradient(180deg, rgba(226, 232, 240, 0.58), rgba(241, 245, 249, 0.92))",
};

const metaTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#475569",
};

const scopeSummaryStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(248, 250, 252, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
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

const emptyStateStyle: CSSProperties = {
  minHeight: "180px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
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

import { startTransition, type CSSProperties } from "react";
import { GroupCard } from "../components/group-card";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { localize, localizeRouteKind } from "../i18n";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeMainViewProps = {
  viewModel: HomeViewModel;
};

export function HomeMainView({ viewModel }: HomeMainViewProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const visibleSourceIds = viewModel.filteredSourceIds;

  return (
    <main data-view="home-page" style={pageStyle}>
      <DesktopTopBar
        routeKind={viewModel.currentRoute.kind}
        desktopLanguage={viewModel.desktopLanguage}
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
                {t("page.home.sources")}: {viewModel.sourceIds.length}
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

          <GroupCard
            title={t("page.home.inventory")}
            subtitle={`${t("page.home.current_route")}: ${localizeRouteKind(viewModel.currentRoute.kind, viewModel.desktopLanguage)}`}
            meta={`${t("page.home.sources")}: ${visibleSourceIds.length}`}
          >
            {visibleSourceIds.length === 0 ? (
              <div data-view="home-empty-state" style={emptyStateStyle}>
                {t("page.home.empty")}
              </div>
            ) : (
              <ul data-view="home-inventory-list" style={inventoryListStyle}>
                {visibleSourceIds.map((sourceId) => (
                  <li key={sourceId} style={inventoryItemStyle}>
                    <button
                      type="button"
                      data-source-id={sourceId}
                      onClick={() => {
                        viewModel.openDetail(sourceId);
                      }}
                      style={sourceLinkStyle}
                    >
                      {sourceId}
                    </button>
                    <button
                      type="button"
                      data-update-source-id={sourceId}
                      onClick={() => {
                        stateTransition(() => viewModel.updateSource(sourceId));
                      }}
                      style={actionButtonStyle()}
                    >
                      {t("action.update")}
                    </button>
                    <button
                      type="button"
                      data-pin-source-id={sourceId}
                      onClick={() => {
                        viewModel.togglePinned(sourceId);
                      }}
                      style={actionButtonStyle(viewModel.isPinned(sourceId))}
                    >
                      {viewModel.isPinned(sourceId) ? t("action.unpin") : t("action.pin")}
                    </button>
                    {viewModel.isPinned(sourceId) ? (
                      <span style={pinnedLabelStyle}>{t("state.pinned")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </GroupCard>
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
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  color: "#0f172a",
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
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(255, 255, 255, 0.84)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
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

const inventoryListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const inventoryItemStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  gap: "8px",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(248, 250, 252, 0.92)",
};

const sourceLinkStyle: CSSProperties = {
  justifySelf: "start",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 600,
  textAlign: "left",
};

const pinnedLabelStyle: CSSProperties = {
  gridColumn: "1 / -1",
  fontSize: "12px",
  color: "#0f766e",
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

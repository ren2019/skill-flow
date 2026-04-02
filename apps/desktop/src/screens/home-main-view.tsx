import { startTransition } from "react";
import { GroupCard } from "../components/group-card";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { localize, localizeRouteKind } from "../i18n";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeMainViewProps = {
  viewModel: HomeViewModel;
};

export function HomeMainView({ viewModel }: HomeMainViewProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);

  return (
    <main>
      <h1>{t("page.home.title")}</h1>
      <DesktopTopBar
        routeKind={viewModel.currentRoute.kind}
        desktopLanguage={viewModel.desktopLanguage}
        searchValue={viewModel.searchQuery}
        onSearchChange={(value) => {
          viewModel.searchQuery = value;
        }}
        onImport={() => {
          viewModel.showImportPage();
        }}
        onSettings={() => {
          viewModel.showSettings();
        }}
      />
      {viewModel.toastMessage ? <p role="status">{viewModel.toastMessage}</p> : null}
      <section>
        <p>
          {t("page.home.scope")}:{" "}
          {viewModel.selectedProjectScope.kind === "project"
            ? viewModel.selectedProjectScope.projectId
            : t("project_scope.global")}
        </p>
        <nav>
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                void viewModel.refresh();
              });
            }}
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
          >
            {t("action.update_all")}
          </button>
          <button
            type="button"
            data-project-scope="global"
            onClick={() => {
              startTransition(() => {
                void viewModel.selectProjectScope({ kind: "global" });
              });
            }}
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
            >
              {scope.title}
            </button>
          ))}
        </nav>
      </section>
      <section>
        <GroupCard
          title={t("page.home.inventory")}
          subtitle={`${t("page.home.current_route")}: ${localizeRouteKind(viewModel.currentRoute.kind, viewModel.desktopLanguage)}`}
          meta={`${t("page.home.sources")}: ${viewModel.sourceIds.length}`}
        >
          <ul>
            {viewModel.sourceIds.map((sourceId) => (
              <li key={sourceId}>
                <button
                  type="button"
                  data-source-id={sourceId}
                  onClick={() => {
                    viewModel.openDetail(sourceId);
                  }}
                >
                  {sourceId}
                </button>
                <button
                  type="button"
                  data-update-source-id={sourceId}
                  onClick={() => {
                    stateTransition(() => viewModel.updateSource(sourceId));
                  }}
                >
                  {t("action.update")}
                </button>
                <button
                  type="button"
                  data-pin-source-id={sourceId}
                  onClick={() => {
                    viewModel.togglePinned(sourceId);
                  }}
                >
                  {viewModel.isPinned(sourceId) ? t("action.unpin") : t("action.pin")}
                </button>
                {viewModel.isPinned(sourceId) ? ` ${t("state.pinned")}` : ""}
              </li>
            ))}
          </ul>
        </GroupCard>
      </section>
    </main>
  );
}

function stateTransition(action: () => Promise<unknown> | unknown) {
  startTransition(() => {
    void action();
  });
}

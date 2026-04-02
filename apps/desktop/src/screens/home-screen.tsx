import { startTransition } from "react";
import { GroupCard } from "../components/group-card";
import { localize } from "../i18n";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeScreenProps = {
  viewModel: HomeViewModel;
};

export function HomeScreen({ viewModel }: HomeScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);

  if (viewModel.homeBootstrapPhase.kind === "loading") {
    return (
      <main>
        <h1>{t("page.home.title")}</h1>
        <p>{t("page.home.loading_workspace")}</p>
      </main>
    );
  }

  if (viewModel.homeBootstrapPhase.kind === "failed") {
    return (
      <main>
        <h1>{t("page.home.title")}</h1>
        <p>{viewModel.homeBootstrapPhase.message}</p>
      </main>
    );
  }

  if (viewModel.sourceIds.length === 0) {
    return (
      <main>
        <h1>{t("page.home.title")}</h1>
        <p>{t("page.home.empty")}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{t("page.home.title")}</h1>
      {viewModel.toastMessage ? <p role="status">{viewModel.toastMessage}</p> : null}
      <p>Scope: {viewModel.selectedProjectScope.kind === "project" ? viewModel.selectedProjectScope.projectId : "global"}</p>
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
      <GroupCard
        title="Inventory"
        subtitle={`Current route: ${viewModel.currentRoute.kind}`}
        meta={`Sources: ${viewModel.sourceIds.length}`}
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
                Update
              </button>
              <button
                type="button"
                data-pin-source-id={sourceId}
                onClick={() => {
                  viewModel.togglePinned(sourceId);
                }}
              >
                {viewModel.isPinned(sourceId) ? "Unpin" : "Pin"}
              </button>
              {viewModel.isPinned(sourceId) ? " Pinned" : ""}
            </li>
          ))}
        </ul>
      </GroupCard>
    </main>
  );
}

function stateTransition(action: () => Promise<unknown> | unknown) {
  startTransition(() => {
    void action();
  });
}

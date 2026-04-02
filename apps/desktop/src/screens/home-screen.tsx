import { startTransition } from "react";
import { GroupCard } from "../components/group-card";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeScreenProps = {
  viewModel: HomeViewModel;
};

export function HomeScreen({ viewModel }: HomeScreenProps) {
  if (viewModel.homeBootstrapPhase.kind === "loading") {
    return (
      <main>
        <h1>Installed Skills</h1>
        <p>Loading workspace</p>
      </main>
    );
  }

  if (viewModel.homeBootstrapPhase.kind === "failed") {
    return (
      <main>
        <h1>Installed Skills</h1>
        <p>{viewModel.homeBootstrapPhase.message}</p>
      </main>
    );
  }

  if (viewModel.sourceIds.length === 0) {
    return (
      <main>
        <h1>Installed Skills</h1>
        <p>No installed sources yet.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Installed Skills</h1>
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
          Refresh
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              void viewModel.updateAllGroupsFromHome();
            });
          }}
        >
          Update All
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
          Global Scope
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

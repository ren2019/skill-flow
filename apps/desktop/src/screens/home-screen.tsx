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
      <GroupCard
        title="Inventory"
        subtitle={`Current route: ${viewModel.currentRoute.kind}`}
        meta={`Sources: ${viewModel.sourceIds.length}`}
      >
        <ul>
          {viewModel.sourceIds.map((sourceId) => (
            <li key={sourceId}>{sourceId}</li>
          ))}
        </ul>
      </GroupCard>
    </main>
  );
}

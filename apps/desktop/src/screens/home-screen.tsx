import { GroupCard } from "../components/group-card";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeScreenProps = {
  viewModel: HomeViewModel;
};

export function HomeScreen({ viewModel }: HomeScreenProps) {
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

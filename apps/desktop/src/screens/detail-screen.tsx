import { GroupCard } from "../components/group-card";
import { MarkdownDocument } from "../components/markdown-document";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailScreenProps = {
  viewModel: DetailViewModel;
};

export function DetailScreen({ viewModel }: DetailScreenProps) {
  const sourceId = viewModel.sourceId ?? "Unknown";

  return (
    <main>
      <h1>Source Detail</h1>
      <GroupCard title={sourceId} subtitle={`Current route: ${viewModel.currentRoute.kind}`}>
        <MarkdownDocument source="No detail content loaded yet." />
      </GroupCard>
    </main>
  );
}

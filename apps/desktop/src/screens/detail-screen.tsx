import { GroupCard } from "../components/group-card";
import { MarkdownDocument } from "../components/markdown-document";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailScreenProps = {
  viewModel: DetailViewModel;
};

export function DetailScreen({ viewModel }: DetailScreenProps) {
  const sourceId = viewModel.sourceId;
  const detail = viewModel.detail;

  if (!sourceId) {
    return (
      <main>
        <h1>Source Detail</h1>
        <p>No source selected</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main>
        <h1>Source Detail</h1>
        <p>Loading source detail</p>
      </main>
    );
  }

  const document = viewModel.showingGroupOverview
    ? viewModel.selectedGroupDocument
    : viewModel.selectedSkillDocument;
  const documentSource = document?.content || "No detail content loaded yet.";

  return (
    <main>
      <h1>Source Detail</h1>
      <GroupCard title={detail.title} subtitle={`Current route: ${viewModel.currentRoute.kind}`}>
        <p>{detail.enabledTargetLabels.join(", ")}</p>
        <ul>
          {detail.fileTree.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
        <ul>
          {detail.groupDocuments.map((groupDocument) => (
            <li key={groupDocument.id}>{groupDocument.title}</li>
          ))}
        </ul>
        <MarkdownDocument source={documentSource} />
      </GroupCard>
    </main>
  );
}

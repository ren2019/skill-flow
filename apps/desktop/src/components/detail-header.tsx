import { DetailViewModel } from "../view-models/detail-view-model";

type DetailHeaderProps = {
  viewModel: DetailViewModel;
};

export function DetailHeader({ viewModel }: DetailHeaderProps) {
  const detail = viewModel.detail;

  if (!detail) {
    return null;
  }

  return (
    <header data-view="detail-header">
      <h1>{detail.title}</h1>
      <p>Version: {detail.revision ?? "-"}</p>
      <p>Targets: {detail.enabledTargetLabels.join(", ") || "-"}</p>
    </header>
  );
}

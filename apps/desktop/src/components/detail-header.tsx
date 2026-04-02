import { localize } from "../i18n";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailHeaderProps = {
  viewModel: DetailViewModel;
};

export function DetailHeader({ viewModel }: DetailHeaderProps) {
  const detail = viewModel.detail;
  const t = (key: string) => localize(key, viewModel.desktopLanguage);

  if (!detail) {
    return null;
  }

  return (
    <header data-view="detail-header">
      <p>{t("page.detail.title")}</p>
      <h1>{detail.title}</h1>
      <p>{t("page.detail.version")}: {detail.revision ?? "-"}</p>
      <p>{t("page.detail.targets")}: {detail.enabledTargetLabels.join(", ") || "-"}</p>
      <p>{t("page.home.current_route")}: {localize(`route.${viewModel.currentRoute.kind}`, viewModel.desktopLanguage)}</p>
    </header>
  );
}

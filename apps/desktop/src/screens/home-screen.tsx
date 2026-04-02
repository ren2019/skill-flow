import { localize } from "../i18n";
import { HomeMainView } from "./home-main-view";
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
        <HomeMainView viewModel={viewModel} />
        <p>{t("page.home.empty")}</p>
      </main>
    );
  }

  return <HomeMainView viewModel={viewModel} />;
}

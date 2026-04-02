import { HomeMainView } from "./home-main-view";
import { HomeViewModel } from "../view-models/home-view-model";

type HomeScreenProps = {
  viewModel: HomeViewModel;
};

export function HomeScreen({ viewModel }: HomeScreenProps) {
  return <HomeMainView viewModel={viewModel} />;
}

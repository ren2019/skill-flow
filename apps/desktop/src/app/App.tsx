import { useRef, useState } from "react";
import { createMutationCoordinator } from "../runtime/mutation-coordinator";
import { DetailScreen } from "../screens/detail-screen";
import { HomeScreen } from "../screens/home-screen";
import { ImportScreen } from "../screens/import-screen";
import { SettingsScreen } from "../screens/settings-screen";
import {
  createDesktopAppState,
  type DesktopAppState,
} from "../store/desktop-app-state";
import { DetailViewModel } from "../view-models/detail-view-model";
import { HomeViewModel } from "../view-models/home-view-model";
import { ImportViewModel } from "../view-models/import-view-model";
import { SettingsViewModel } from "../view-models/settings-view-model";

type AppProps = {
  state?: DesktopAppState;
};

export function App({ state: providedState }: AppProps) {
  const stateRef = useRef(providedState ?? createDesktopAppState());
  const [, setRevision] = useState(0);
  const mutationCoordinatorRef = useRef(createMutationCoordinator());
  const notifyChange = () => {
    setRevision((value) => value + 1);
  };
  const homeViewModelRef = useRef(
    new HomeViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      onChange: notifyChange,
    }),
  );
  const importViewModelRef = useRef(
    new ImportViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      onChange: notifyChange,
    }),
  );
  const detailViewModelRef = useRef(
    new DetailViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      onChange: notifyChange,
    }),
  );
  const settingsViewModelRef = useRef(
    new SettingsViewModel(stateRef.current, { onChange: notifyChange }),
  );

  switch (stateRef.current.view.currentRoute.kind) {
    case "home":
      return <HomeScreen viewModel={homeViewModelRef.current} />;
    case "importPage":
      return <ImportScreen viewModel={importViewModelRef.current} />;
    case "detail":
      return <DetailScreen viewModel={detailViewModelRef.current} />;
    case "settings":
      return <SettingsScreen viewModel={settingsViewModelRef.current} />;
  }
}

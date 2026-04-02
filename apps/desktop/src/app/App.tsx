import { useRef, useState } from "react";
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
  const notifyChange = () => {
    setRevision((value) => value + 1);
  };

  switch (stateRef.current.view.currentRoute.kind) {
    case "home":
      return <HomeScreen viewModel={new HomeViewModel(stateRef.current, { onChange: notifyChange })} />;
    case "importPage":
      return <ImportScreen viewModel={new ImportViewModel(stateRef.current, { onChange: notifyChange })} />;
    case "detail":
      return <DetailScreen viewModel={new DetailViewModel(stateRef.current, { onChange: notifyChange })} />;
    case "settings":
      return <SettingsScreen viewModel={new SettingsViewModel(stateRef.current, { onChange: notifyChange })} />;
  }
}

import { useRef } from "react";
import { DetailScreen } from "../screens/detail-screen";
import { HomeScreen } from "../screens/home-screen";
import { ImportScreen } from "../screens/import-screen";
import { SettingsScreen } from "../screens/settings-screen";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DetailViewModel } from "../view-models/detail-view-model";
import { HomeViewModel } from "../view-models/home-view-model";
import { ImportViewModel } from "../view-models/import-view-model";
import { MainViewModel } from "../view-models/main-view-model";
import { SettingsViewModel } from "../view-models/settings-view-model";

export function App() {
  const stateRef = useRef(createDesktopAppState());
  const mainRef = useRef(new MainViewModel(stateRef.current));

  switch (mainRef.current.currentRoute.kind) {
    case "home":
      return <HomeScreen viewModel={new HomeViewModel(stateRef.current)} />;
    case "importPage":
      return <ImportScreen viewModel={new ImportViewModel(stateRef.current)} />;
    case "detail":
      return <DetailScreen viewModel={new DetailViewModel(stateRef.current)} />;
    case "settings":
      return <SettingsScreen viewModel={new SettingsViewModel(stateRef.current)} />;
  }
}

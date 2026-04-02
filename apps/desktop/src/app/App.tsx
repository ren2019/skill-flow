import { useEffect, useRef, useState } from "react";
import { createMutationCoordinator } from "../runtime/mutation-coordinator";
import { registerTrayRouteListener } from "../menu/tray";
import { DetailScreen } from "../screens/detail-screen";
import { HomeScreen } from "../screens/home-screen";
import { ImportScreen } from "../screens/import-screen";
import { SettingsScreen } from "../screens/settings-screen";
import {
  createDesktopAppState,
  type DesktopAppState,
} from "../store/desktop-app-state";
import {
  createDesktopIntegration,
  type DesktopIntegration,
} from "../runtime/desktop-integration";
import { DetailViewModel } from "../view-models/detail-view-model";
import { HomeViewModel } from "../view-models/home-view-model";
import { ImportViewModel } from "../view-models/import-view-model";
import { MainViewModel } from "../view-models/main-view-model";
import { SettingsViewModel } from "../view-models/settings-view-model";

type AppProps = {
  state?: DesktopAppState;
  integration?: DesktopIntegration;
};

export function App({ state: providedState, integration }: AppProps) {
  const stateRef = useRef(providedState ?? createDesktopAppState());
  const [, setRevision] = useState(0);
  const mutationCoordinatorRef = useRef(createMutationCoordinator());
  const defaultIntegrationRef = useRef<DesktopIntegration | undefined>(undefined);
  if (!integration && !defaultIntegrationRef.current) {
    defaultIntegrationRef.current = createDesktopIntegration(stateRef.current);
  }
  const activeIntegration = integration ?? defaultIntegrationRef.current;
  const notifyChange = () => {
    setRevision((value) => value + 1);
  };
  const mainViewModelRef = useRef(new MainViewModel(stateRef.current));
  const homeViewModelRef = useRef(
    new HomeViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      refreshList: activeIntegration?.refreshInventory,
      onChange: notifyChange,
    }),
  );
  const importViewModelRef = useRef(
    new ImportViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      onImportCompleted: () => homeViewModelRef.current.refresh(),
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

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void registerTrayRouteListener((route) => {
      switch (route.kind) {
        case "home":
          mainViewModelRef.current.showHome();
          break;
        case "importPage":
          mainViewModelRef.current.showImportPage();
          break;
        case "settings":
          mainViewModelRef.current.showSettings();
          break;
        case "detail":
          mainViewModelRef.current.showDetail(route.sourceId);
          break;
      }
      notifyChange();
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      unlisten = cleanup;
    }).catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

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

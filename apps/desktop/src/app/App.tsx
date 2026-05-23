import { startTransition, useEffect, useRef, useState } from "react";
import { createMutationCoordinator } from "../runtime/mutation-coordinator";
import { registerTrayRouteListener } from "../menu/tray";
import { DetailScreen } from "../screens/detail-screen";
import { HomeScreen } from "../screens/home-screen";
import { ImportScreen } from "../screens/import-screen";
import { MenuQuickConfigScreen } from "../screens/menu-quick-config-screen";
import { SettingsScreen } from "../screens/settings-screen";
import {
  createDesktopAppState,
  type DesktopAppState,
} from "../store/desktop-app-state";
import {
  createDesktopIntegration,
  type DesktopIntegration,
} from "../runtime/desktop-integration";
import { createDesktopMaintenance } from "../runtime/desktop-maintenance";
import { createDesktopOpener } from "../runtime/desktop-opener";
import { DesktopGroupTagStore } from "../runtime/group-tag-store";
import { createDesktopSettingsStorage, DesktopSettingsStore } from "../runtime/settings-store";
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
  const activeDetailEntryRef = useRef<string | undefined>(undefined);
  const mutationCoordinatorRef = useRef(createMutationCoordinator());
  const defaultIntegrationRef = useRef<DesktopIntegration | undefined>(undefined);
  const desktopStorageRef = useRef<ReturnType<typeof createDesktopSettingsStorage> | undefined>(undefined);
  const settingsStoreRef = useRef<DesktopSettingsStore | undefined>(undefined);
  const groupTagStoreRef = useRef<DesktopGroupTagStore | undefined>(undefined);
  const desktopOpenerRef = useRef(createDesktopOpener());
  if (!integration && !defaultIntegrationRef.current) {
    defaultIntegrationRef.current = createDesktopIntegration(stateRef.current);
  }
  if (!desktopStorageRef.current) {
    desktopStorageRef.current = createDesktopSettingsStorage();
  }
  if (!settingsStoreRef.current) {
    settingsStoreRef.current = new DesktopSettingsStore(desktopStorageRef.current);
  }
  if (!groupTagStoreRef.current) {
    groupTagStoreRef.current = new DesktopGroupTagStore(desktopStorageRef.current);
  }
  const activeIntegration = integration ?? defaultIntegrationRef.current;
  if (stateRef.current.view.currentRoute.kind !== "detail") {
    activeDetailEntryRef.current = undefined;
  }
  const notifyChange = () => {
    setRevision((value) => value + 1);
  };
  const mainViewModelRef = useRef(new MainViewModel(stateRef.current));
  const refreshInventory = activeIntegration?.refreshInventory;
  const updateSource = activeIntegration?.updateSource;
  const updateSources = activeIntegration?.updateSources;
  const updateSelection = activeIntegration?.updateSelection;
  const searchImportGroups = activeIntegration?.searchImportGroups;
  const previewImportSource = activeIntegration?.previewImportSource;
  const importSource = activeIntegration?.importSource;
  const togglePinnedSource = activeIntegration?.togglePinnedSource;
  const deleteSource = activeIntegration?.deleteSource;
  const homeViewModelRef = useRef(
    new HomeViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      ...(refreshInventory ? { refreshList: refreshInventory } : {}),
      ...(updateSource ? { updateGroup: updateSource } : {}),
      ...(updateSources ? { updateGroups: updateSources } : {}),
      ...(updateSelection ? { updateSelection } : {}),
      ...(togglePinnedSource ? { togglePinnedSource } : {}),
      ...(deleteSource ? { deleteSource } : {}),
      openExternalUrl: (url) => desktopOpenerRef.current.openExternalUrl(url),
      openPath: (path) => desktopOpenerRef.current.openPath(path),
      persistSettings: () => settingsStoreRef.current?.save(stateRef.current.settings),
      groupTagStore: groupTagStoreRef.current,
      onChange: notifyChange,
    }),
  );
  const importViewModelRef = useRef(
    new ImportViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      ...(searchImportGroups ? { searchLoader: searchImportGroups } : {}),
      ...(previewImportSource
        ? {
          previewLoader: (groupId) => {
            const group = findImportGroup(stateRef.current, groupId);
            return previewImportSource(group?.locator ?? groupId);
          },
        }
        : {}),
      ...(importSource
        ? {
          importer: (groupId, draft) => {
            const group = findImportGroup(stateRef.current, groupId);
            return importSource(group?.locator ?? groupId, draft);
          },
        }
        : {}),
      openExternalUrl: (url) => desktopOpenerRef.current.openExternalUrl(url),
      onImportCompleted: () => homeViewModelRef.current.refresh(),
      onChange: notifyChange,
    }),
  );
  const detailViewModelRef = useRef(
    new DetailViewModel(stateRef.current, {
      mutationCoordinator: mutationCoordinatorRef.current,
      ...(updateSelection ? { updateSelection } : {}),
      updateGroup: (sourceId) => homeViewModelRef.current.updateSource(sourceId),
      isUpdatingSource: (sourceId) => homeViewModelRef.current.isUpdatingSource(sourceId),
      openExternalUrl: (url) => desktopOpenerRef.current.openExternalUrl(url),
      openPath: (path) => desktopOpenerRef.current.openPath(path),
      groupTagStore: groupTagStoreRef.current,
      onChange: notifyChange,
    }),
  );
  const settingsViewModelRef = useRef(
    new SettingsViewModel(stateRef.current, {
      store: settingsStoreRef.current,
      maintenance: createDesktopMaintenance(),
      onChange: notifyChange,
    }),
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
        case "menuQuickConfig":
          mainViewModelRef.current.showMenuQuickConfig();
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

  useEffect(() => {
    if (stateRef.current.view.currentRoute.kind !== "home") {
      return;
    }
    if (stateRef.current.asyncResources.homeBootstrapPhase.kind !== "idle") {
      return;
    }

    stateRef.current.asyncResources.homeBootstrapPhase = { kind: "loading" };
    notifyChange();

    startTransition(() => {
      void activeIntegration?.refreshInventory()
        .then(() => {
          if (!stateRef.current.view.selectedSourceId && stateRef.current.workspace.sourceIds.length > 0) {
            stateRef.current.view.selectedSourceId = stateRef.current.workspace.sourceIds[0];
          }
          stateRef.current.asyncResources.homeBootstrapPhase = { kind: "ready" };
          notifyChange();
        })
        .catch((error) => {
          stateRef.current.asyncResources.homeBootstrapPhase = {
            kind: "failed",
            message: error instanceof Error ? error.message : "Unable to bootstrap desktop runtime.",
          };
          notifyChange();
        });
    });
  }, [
    activeIntegration,
    stateRef.current.asyncResources.homeBootstrapPhase.kind,
    stateRef.current.view.currentRoute.kind,
  ]);

  useEffect(() => {
    const currentRoute = stateRef.current.view.currentRoute;
    if (currentRoute.kind !== "detail") {
      activeDetailEntryRef.current = undefined;
      return;
    }

    const sourceId = currentRoute.sourceId.trim();
    if (!sourceId) {
      return;
    }
    if (activeDetailEntryRef.current === sourceId) {
      return;
    }

    activeDetailEntryRef.current = sourceId;
    if (stateRef.current.view.selectedSourceId !== sourceId) {
      stateRef.current.view.selectedSourceId = sourceId;
      notifyChange();
    }

    const loadDetail = activeIntegration?.loadDetail;
    if (!loadDetail) {
      return;
    }

    startTransition(() => {
      void loadDetail(sourceId)
        .then(() => {
          notifyChange();
        })
        .catch(() => {
          notifyChange();
        });
    });
  }, [
    activeIntegration,
    stateRef.current.view.currentRoute,
  ]);

  switch (stateRef.current.view.currentRoute.kind) {
    case "home":
      return <HomeScreen viewModel={homeViewModelRef.current} />;
    case "importPage":
      return <ImportScreen viewModel={importViewModelRef.current} />;
    case "menuQuickConfig":
      return <MenuQuickConfigScreen viewModel={homeViewModelRef.current} />;
    case "detail":
      return <DetailScreen viewModel={detailViewModelRef.current} />;
    case "settings":
      return (
        <SettingsScreen
          viewModel={settingsViewModelRef.current}
          detectedTargetIds={mainViewModelRef.current.detectedTargetIdsForSettings}
        />
      );
  }
}

function findImportGroup(state: DesktopAppState, groupId: string) {
  return [...state.importState.recommendedGroups, ...state.importState.searchGroups].find((group) => group.id === groupId);
}

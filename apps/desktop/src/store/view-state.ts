import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";

export type ViewState = {
  currentRoute: DesktopRoute;
  selectedSourceId: string | undefined;
};

export function createViewState(seed: Partial<ViewState> = {}): ViewState {
  return {
    currentRoute: seed.currentRoute ?? desktopRoute.home(),
    selectedSourceId: seed.selectedSourceId,
  };
}

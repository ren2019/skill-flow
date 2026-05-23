import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";

export type TrayMenuItem = {
  id: "open-quick-config" | "open-home" | "open-import" | "open-settings";
  route: DesktopRoute;
};

export const TRAY_ROUTE_EVENT = "desktop://tray-route";

export type TrayListen = (
  eventName: string,
  callback: (event: { payload: string }) => void,
) => Promise<() => void>;

export function buildTrayMenuModel(): TrayMenuItem[] {
  return [
    { id: "open-quick-config", route: desktopRoute.menuQuickConfig() },
    { id: "open-home", route: desktopRoute.home() },
    { id: "open-import", route: desktopRoute.importPage() },
    { id: "open-settings", route: desktopRoute.settings() },
  ];
}

export function resolveTrayRoute(menuId: string): DesktopRoute | undefined {
  return buildTrayMenuModel().find((item) => item.id === menuId)?.route;
}

export async function registerTrayRouteListener(
  onRoute: (route: DesktopRoute) => void,
  listenImpl?: TrayListen,
): Promise<() => void> {
  const listen = listenImpl ?? (await import("@tauri-apps/api/event")).listen;
  return listen(TRAY_ROUTE_EVENT, (event) => {
    const route = resolveTrayRoute(String(event.payload));
    if (route) {
      onRoute(route);
    }
  });
}

import { desktopRoute, type DesktopRoute } from "../navigation/desktop-route";

export type TrayMenuItem = {
  id: "open-home" | "open-import" | "open-settings";
  route: DesktopRoute;
};

export function buildTrayMenuModel(): TrayMenuItem[] {
  return [
    { id: "open-home", route: desktopRoute.home() },
    { id: "open-import", route: desktopRoute.importPage() },
    { id: "open-settings", route: desktopRoute.settings() },
  ];
}

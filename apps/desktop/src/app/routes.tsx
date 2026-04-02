export type DesktopRouteInventory =
  | "home"
  | "detail(sourceId)"
  | "importPage"
  | "settings";

const ROUTE_INVENTORY: readonly DesktopRouteInventory[] = [
  "home",
  "detail(sourceId)",
  "importPage",
  "settings",
] as const;

export function getRouteInventory(): readonly DesktopRouteInventory[] {
  return ROUTE_INVENTORY;
}

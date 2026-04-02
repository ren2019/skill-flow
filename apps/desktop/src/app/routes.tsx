const ROUTE_INVENTORY = [
  "/",
  "/import",
  "/detail/:skillId",
  "/settings",
] as const;

export function getRouteInventory() {
  return ROUTE_INVENTORY;
}

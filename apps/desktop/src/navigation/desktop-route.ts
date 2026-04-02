export type DesktopRoute =
  | { kind: "home" }
  | { kind: "detail"; sourceId: string }
  | { kind: "importPage" }
  | { kind: "settings" };

export const desktopRoute = {
  home(): DesktopRoute {
    return { kind: "home" };
  },

  detail(sourceId: string): DesktopRoute {
    return { kind: "detail", sourceId };
  },

  importPage(): DesktopRoute {
    return { kind: "importPage" };
  },

  settings(): DesktopRoute {
    return { kind: "settings" };
  },
} as const;

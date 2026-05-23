export type DesktopRoute =
  | { kind: "home" }
  | { kind: "detail"; sourceId: string }
  | { kind: "importPage" }
  | { kind: "menuQuickConfig" }
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

  menuQuickConfig(): DesktopRoute {
    return { kind: "menuQuickConfig" };
  },

  settings(): DesktopRoute {
    return { kind: "settings" };
  },
} as const;

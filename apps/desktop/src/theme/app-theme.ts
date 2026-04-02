export type DesktopThemeMode = "light" | "dark";

export type DesktopAccentColor = "blue" | "green" | "yellow" | "pink" | "orange" | "purple";

const grayscale = (value: number) => `rgb(${value}, ${value}, ${value})`;

const brandByAccent: Record<DesktopAccentColor, { light: string; dark: string }> = {
  blue: { light: "rgb(59, 130, 246)", dark: "rgb(125, 176, 255)" },
  green: { light: "rgb(34, 197, 94)", dark: "rgb(74, 222, 128)" },
  yellow: { light: "rgb(234, 179, 8)", dark: "rgb(250, 204, 21)" },
  pink: { light: "rgb(236, 72, 153)", dark: "rgb(244, 114, 182)" },
  orange: { light: "rgb(249, 115, 22)", dark: "rgb(251, 146, 60)" },
  purple: { light: "rgb(139, 92, 246)", dark: "rgb(167, 139, 250)" },
};

export const desktopTheme = {
  brand(accent: DesktopAccentColor, mode: DesktopThemeMode): string {
    return brandByAccent[accent][mode];
  },
  pageBackground(mode: DesktopThemeMode): string {
    return mode === "light" ? grayscale(242) : grayscale(34);
  },
  surface(mode: DesktopThemeMode): string {
    return mode === "light" ? grayscale(253) : grayscale(14);
  },
  detailBodyBackground(mode: DesktopThemeMode): string {
    return mode === "light" ? grayscale(249) : grayscale(21);
  },
  headerBackground(mode: DesktopThemeMode): string {
    return mode === "light" ? grayscale(242) : grayscale(34);
  },
  headerControlFill(mode: DesktopThemeMode): string {
    return mode === "light" ? grayscale(253) : grayscale(14);
  },
  cardBorder(mode: DesktopThemeMode): string {
    return mode === "light" ? grayscale(242) : grayscale(34);
  },
  textPrimary(mode: DesktopThemeMode): string {
    return mode === "light" ? "rgb(38, 38, 38)" : "rgb(239, 239, 241)";
  },
  textMuted(mode: DesktopThemeMode): string {
    return mode === "light" ? "rgba(38, 38, 38, 0.62)" : "rgba(229, 229, 231, 0.68)";
  },
  toolbarButtonBackground(mode: DesktopThemeMode): string {
    return mode === "light" ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 255, 255, 0.10)";
  },
  toolbarGlass(mode: DesktopThemeMode): string {
    return mode === "light" ? "rgba(255, 255, 255, 0.44)" : "rgba(255, 255, 255, 0.08)";
  },
  controlShadow(mode: DesktopThemeMode): string {
    return mode === "light" ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.16)";
  },
  cardShadow(mode: DesktopThemeMode): string {
    return mode === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.10)";
  },
} as const;

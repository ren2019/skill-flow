import type { CSSProperties } from "react";
import { resolveActionIcon, resolveMenuBarIcon } from "../icons/action-icons";
import { localize } from "../i18n";
import type { DesktopRoute } from "../navigation/desktop-route";
import { desktopTheme, type DesktopAccentColor, type DesktopThemeMode } from "../theme/app-theme";
import { IconButton } from "./icon-button";

type DesktopTopBarProps = {
  routeKind: DesktopRoute["kind"];
  desktopLanguage: string;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  searchValue: string;
  showsProjectScopeBar?: boolean;
  onSearchChange: (value: string) => void;
  onToggleProjectScope?: () => void;
  onImport: () => void;
  onUpdate: () => void;
  onSettings: () => void;
};

export function DesktopTopBar({
  routeKind,
  desktopLanguage,
  themeMode,
  themeAccent,
  searchValue,
  showsProjectScopeBar = false,
  onSearchChange,
  onToggleProjectScope,
  onImport,
  onUpdate,
  onSettings,
}: DesktopTopBarProps) {
  const t = (key: string) => localize(key, desktopLanguage);

  return (
    <header
      data-view="home-top-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        justifyContent: "space-between",
        padding: "10px 16px",
        minHeight: "52px",
        background: desktopTheme.headerBackground(themeMode),
      }}
    >
      <div
        data-view="home-brand"
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "182px" }}
      >
        <a href="https://github.com/VintLin/skill-flow" aria-label={t("app.name")} style={brandAnchorStyle}>
          <img
            src={resolveMenuBarIcon()}
            alt=""
            aria-hidden="true"
            data-menu-bar-icon="true"
            style={{ width: "30px", height: "30px", objectFit: "contain" }}
          />
        </a>
        <strong
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: desktopTheme.textPrimary(themeMode),
          }}
        >
          {t("app.name")}
        </strong>
      </div>
      {routeKind === "home" ? (
        <>
          <label
            data-view="home-search-shell"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "384px",
              height: "34px",
              padding: "0 12px",
              borderRadius: "8px",
              background: desktopTheme.headerControlFill(themeMode),
              boxShadow: `0 2px 4px ${desktopTheme.controlShadow(themeMode)}`,
              border: `0.5px solid ${desktopTheme.cardBorder(themeMode)}`,
            }}
          >
            <img
              src={resolveActionIcon("search")}
              alt=""
              aria-hidden="true"
              style={{ width: "11px", height: "11px", opacity: 0.7 }}
            />
            <input
              data-testid="home-search-input"
              aria-label={t("page.home.search_placeholder")}
              placeholder={t("page.home.search_placeholder")}
              value={searchValue}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "12px",
                fontWeight: 400,
                textTransform: "uppercase",
                color: desktopTheme.textPrimary(themeMode),
              }}
            />
          </label>
          <div data-view="home-top-bar-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconButton
              data-testid="home-scope-toggle"
              icon={showsProjectScopeBar ? "project-warning" : "project"}
              label={t("page.home.scope")}
              active={showsProjectScopeBar}
              onClick={onToggleProjectScope}
            />
            <IconButton
              icon="import"
              label={t("route.importPage")}
              onClick={onImport}
            />
            <IconButton
              icon="update"
              label={t("action.update_all")}
              onClick={onUpdate}
            />
            <IconButton
              icon="settings"
              label={t("route.settings")}
              onClick={onSettings}
            />
          </div>
        </>
      ) : null}
    </header>
  );
}

const brandAnchorStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

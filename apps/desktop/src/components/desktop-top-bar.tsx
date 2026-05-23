import type { CSSProperties } from "react";
import { resolveActionIcon, resolveMenuBarIcon } from "../icons/action-icons";
import { localize } from "../i18n";
import type { DesktopRoute } from "../navigation/desktop-route";
import { desktopTheme, type DesktopAccentColor, type DesktopThemeMode } from "../theme/app-theme";
import { IconButton } from "./icon-button";

type ImportSearchState = {
  value: string;
  placeholder: string;
  phaseKind: string;
  resultCount: number;
  submittedQuery: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

type DesktopTopBarProps = {
  routeKind: DesktopRoute["kind"];
  desktopLanguage: string;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  searchValue: string;
  showsProjectScopeBar?: boolean;
  title?: string;
  importSearch?: ImportSearchState;
  onSearchChange: (value: string) => void;
  onBack?: () => void;
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
  title,
  importSearch,
  onSearchChange,
  onBack,
  onToggleProjectScope,
  onImport,
  onUpdate,
  onSettings,
}: DesktopTopBarProps) {
  const t = (key: string) => localize(key, desktopLanguage);
  const pageTitle = title ?? localize(`route.${routeKind}`, desktopLanguage);
  const showsImportSearch = routeKind === "importPage" && importSearch;

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
      {routeKind === "home" ? <HomeBrand title={t("app.name")} themeMode={themeMode} /> : (
        <div data-view="desktop-route-title" style={routeTitleStyle}>
          <IconButton icon="back" label={t("action.back")} onClick={onBack} />
          <strong style={topBarTitleStyle(themeMode)}>{pageTitle}</strong>
        </div>
      )}
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
      {showsImportSearch ? (
        <>
          <label data-view="import-search-shell" style={searchShellStyle(themeMode)}>
            <img
              src={resolveActionIcon("search")}
              alt=""
              aria-hidden="true"
              style={{ width: "11px", height: "11px", opacity: 0.7 }}
            />
            <input
              data-testid="import-search-input"
              aria-label={importSearch.placeholder}
              placeholder={importSearch.placeholder}
              value={importSearch.value}
              onChange={(event) => {
                importSearch.onChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  importSearch.onSubmit();
                }
              }}
              style={searchInputStyle(themeMode)}
            />
          </label>
          <button
            type="button"
            data-testid="import-search-submit"
            aria-label={t("action.search")}
            onClick={importSearch.onSubmit}
            style={importSearchActionStyle(themeMode, themeAccent)}
          >
            {importSearch.phaseKind === "loading" ? (
              <span data-view="import-search-loading" style={searchActionTextStyle(themeAccent, themeMode)}>...</span>
            ) : importSearch.submittedQuery.trim() ? (
              <span data-view="import-search-result-count" style={searchActionTextStyle(themeAccent, themeMode)}>
                {importSearch.resultCount}
              </span>
            ) : (
              <img
                src={resolveActionIcon("search-submit-enter")}
                alt=""
                aria-hidden="true"
                style={{ width: "14px", height: "14px" }}
              />
            )}
            <span style={srOnlyStyle}>{t("action.search")}</span>
          </button>
          <div style={{ flex: 1 }} />
        </>
      ) : routeKind !== "home" ? (
        <div style={{ flex: 1 }} />
      ) : null}
    </header>
  );
}

function HomeBrand({ title, themeMode }: { title: string; themeMode: DesktopThemeMode }) {
  return (
    <div
      data-view="home-brand"
      style={{ display: "flex", alignItems: "center", gap: "8px", width: "182px" }}
    >
      <a href="https://github.com/VintLin/skill-flow" aria-label={title} style={brandAnchorStyle}>
        <img
          src={resolveMenuBarIcon()}
          alt=""
          aria-hidden="true"
          data-menu-bar-icon="true"
          style={{ width: "30px", height: "30px", objectFit: "contain" }}
        />
      </a>
      <strong style={topBarTitleStyle(themeMode)}>{title}</strong>
    </div>
  );
}

const brandAnchorStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const routeTitleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  width: "182px",
};

const topBarTitleStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  fontSize: "17px",
  fontWeight: 600,
  color: desktopTheme.textPrimary(themeMode),
});

const searchShellStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
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
});

const searchInputStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  width: "100%",
  border: "none",
  background: "transparent",
  outline: "none",
  fontSize: "12px",
  fontWeight: 400,
  color: desktopTheme.textPrimary(themeMode),
});

const importSearchActionStyle = (
  themeMode: DesktopThemeMode,
  themeAccent: DesktopAccentColor,
): CSSProperties => ({
  width: "34px",
  height: "34px",
  border: "none",
  borderRadius: "8px",
  background: `${desktopTheme.brand(themeAccent, themeMode)}24`,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
});

const searchActionTextStyle = (
  themeAccent: DesktopAccentColor,
  themeMode: DesktopThemeMode,
): CSSProperties => ({
  color: desktopTheme.brand(themeAccent, themeMode),
  fontSize: "11px",
  fontWeight: 700,
});

const srOnlyStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

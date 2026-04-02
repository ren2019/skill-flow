import type { CSSProperties } from "react";
import { localize } from "../i18n";
import type { DesktopRoute } from "../navigation/desktop-route";

type DesktopTopBarProps = {
  routeKind: DesktopRoute["kind"];
  desktopLanguage: string;
  searchValue: string;
  showsProjectScopeBar?: boolean;
  onSearchChange: (value: string) => void;
  onToggleProjectScope?: () => void;
  onImport: () => void;
  onSettings: () => void;
};

export function DesktopTopBar({
  routeKind,
  desktopLanguage,
  searchValue,
  showsProjectScopeBar = false,
  onSearchChange,
  onToggleProjectScope,
  onImport,
  onSettings,
}: DesktopTopBarProps) {
  const t = (key: string) => localize(key, desktopLanguage);

  return (
    <header
      data-view="home-top-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        background: "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92))",
      }}
    >
      <div
        data-view="home-brand"
        style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "164px" }}
      >
        <a
          href="https://github.com/VintLin/skill-flow"
          aria-label={t("app.name")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0f172a, #334155)",
            color: "#f8fafc",
            fontSize: "11px",
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "0.08em",
          }}
        >
          SF
        </a>
        <strong style={{ fontSize: "17px", fontWeight: 600 }}>{t("app.name")}</strong>
      </div>
      {routeKind === "home" ? (
        <div
          data-view="home-top-bar-actions"
          style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}
        >
          <label
            data-view="home-search-shell"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "320px",
              maxWidth: "420px",
              flex: 1,
              padding: "0 12px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "rgba(255, 255, 255, 0.92)",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <span style={{ fontSize: "12px", color: "#64748b" }}>⌕</span>
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
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            />
          </label>
          <button
            data-testid="home-scope-toggle"
            type="button"
            aria-pressed={showsProjectScopeBar}
            onClick={onToggleProjectScope}
            style={toolbarButtonStyle(showsProjectScopeBar)}
          >
            {t("page.home.scope")}
          </button>
          <button type="button" onClick={onImport} style={toolbarButtonStyle()}>
            {t("route.importPage")}
          </button>
          <button type="button" onClick={onSettings} style={toolbarButtonStyle()}>
            {t("route.settings")}
          </button>
        </div>
      ) : null}
    </header>
  );
}

function toolbarButtonStyle(active = false): CSSProperties {
  return {
    height: "36px",
    padding: "0 12px",
    borderRadius: "10px",
    border: active ? "1px solid rgba(14, 116, 144, 0.32)" : "1px solid rgba(148, 163, 184, 0.28)",
    background: active ? "rgba(224, 242, 254, 0.92)" : "rgba(255, 255, 255, 0.88)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

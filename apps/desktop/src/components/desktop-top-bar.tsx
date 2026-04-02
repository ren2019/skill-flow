import { localize } from "../i18n";
import type { DesktopRoute } from "../navigation/desktop-route";

type DesktopTopBarProps = {
  routeKind: DesktopRoute["kind"];
  desktopLanguage: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onImport: () => void;
  onSettings: () => void;
};

export function DesktopTopBar({
  routeKind,
  desktopLanguage,
  searchValue,
  onSearchChange,
  onImport,
  onSettings,
}: DesktopTopBarProps) {
  const t = (key: string) => localize(key, desktopLanguage);

  return (
    <header>
      <div>
        <strong>{t("app.name")}</strong>
      </div>
      {routeKind === "home" ? (
        <div>
          <input
            aria-label={t("page.home.search_placeholder")}
            placeholder={t("page.home.search_placeholder")}
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
          />
          <button type="button" onClick={onImport}>
            {t("route.importPage")}
          </button>
          <button type="button" onClick={onSettings}>
            {t("route.settings")}
          </button>
        </div>
      ) : null}
    </header>
  );
}

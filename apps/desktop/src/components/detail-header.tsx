import type { CSSProperties } from "react";
import { localize } from "../i18n";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailHeaderProps = {
  viewModel: DetailViewModel;
};

export function formatDetailVersionText(version: string | undefined, language: string): string {
  if (!version) {
    return " ";
  }

  const normalizedVersion = version.toLowerCase().startsWith("v") ? version : `v${version}`;
  return `${localize("page.detail.version", language)} ${normalizedVersion}`;
}

export function DetailHeader({ viewModel }: DetailHeaderProps) {
  const detail = viewModel.detail;
  const t = (key: string) => localize(key, viewModel.desktopLanguage);

  if (!detail) {
    return null;
  }

  return (
    <header data-view="detail-header" style={headerStyle}>
      <div style={{ display: "grid", gap: "6px" }}>
        <p style={eyebrowStyle}>{t("page.detail.title")}</p>
        <h1 style={titleStyle}># {detail.title}</h1>
        <p style={metaTextStyle}>
          {t("page.home.current_route")}:{" "}
          {localize(`route.${viewModel.currentRoute.kind}`, viewModel.desktopLanguage)}
        </p>
      </div>
      <div data-view="detail-meta-grid" style={metaGridStyle}>
        <div style={metaCardStyle}>
          <span style={metaLabelStyle}>{t("page.detail.version")}</span>
          <strong>{formatDetailVersionText(detail.revision, viewModel.desktopLanguage)}</strong>
        </div>
        <div style={metaCardStyle}>
          <span style={metaLabelStyle}>{t("page.detail.targets")}</span>
          <strong>{detail.enabledTargetLabels.join(", ") || "-"}</strong>
        </div>
      </div>
    </header>
  );
}

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  padding: "18px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.9))",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "26px",
  fontWeight: 700,
  color: "#0f172a",
};

const metaTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#64748b",
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  minWidth: "320px",
};

const metaCardStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "12px 14px",
  borderRadius: "16px",
  background: "rgba(241, 245, 249, 0.92)",
};

const metaLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

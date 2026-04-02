import type { CSSProperties } from "react";
import { localize } from "../i18n";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailSidebarProps = {
  viewModel: DetailViewModel;
};

export function DetailSidebar({ viewModel }: DetailSidebarProps) {
  const detail = viewModel.detail;
  const sourceId = viewModel.sourceId;
  const t = (key: string) => localize(key, viewModel.desktopLanguage);

  if (!detail || !sourceId) {
    return null;
  }

  return (
    <aside data-view="detail-sidebar" style={sidebarStyle}>
      <div style={sidebarBlockStyle}>
        <button
          type="button"
          data-group-overview-id={sourceId}
          onClick={() => {
            viewModel.showOverview();
          }}
          style={sidebarPrimaryButtonStyle(viewModel.showingGroupOverview)}
        >
          {t("page.detail.overview")}
        </button>
        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{detail.title}</strong>
      </div>
      <div style={sidebarBlockStyle}>
        <h2 style={sidebarHeadingStyle}>{t("page.detail.skills")}</h2>
        <ul style={sidebarListStyle}>
          {detail.skills.map((skill) => (
            <li key={skill.id}>
              <button
                type="button"
                data-skill-id={skill.id}
                onClick={() => {
                  viewModel.selectSkill(skill.id);
                }}
                style={sidebarSkillButtonStyle(viewModel.selectedSkillId === skill.id && !viewModel.showingGroupOverview)}
              >
                <span>{skill.title}</span>
                <span style={{ color: skill.isEnabled ? "#0f766e" : "#94a3b8", fontSize: "11px" }}>
                  {skill.id}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

const sidebarStyle: CSSProperties = {
  width: "280px",
  minWidth: "280px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255, 255, 255, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

const sidebarBlockStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const sidebarHeadingStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

const sidebarListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "8px",
};

function sidebarPrimaryButtonStyle(active: boolean): CSSProperties {
  return {
    justifyContent: "flex-start",
    height: "40px",
    padding: "0 14px",
    borderRadius: "12px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(224, 242, 254, 0.88)" : "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 700,
  };
}

function sidebarSkillButtonStyle(active: boolean): CSSProperties {
  return {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    minHeight: "44px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.16)",
    background: active ? "rgba(224, 242, 254, 0.9)" : "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    textAlign: "left",
  };
}

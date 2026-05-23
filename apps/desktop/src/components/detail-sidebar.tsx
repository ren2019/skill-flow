import { startTransition, type CSSProperties, type MouseEvent } from "react";
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
        <div
          data-group-overview-id={sourceId}
          onClick={() => {
            viewModel.showOverview();
          }}
          style={sidebarPrimaryButtonStyle(viewModel.showingGroupOverview)}
        >
          <span style={sidebarTitleStackStyle}>
            <span>{detail.title}</span>
            <span style={sidebarMetaStyle}>{detail.author ? t("detail.meta.by").replace("%@", detail.author) : t("page.detail.overview")}</span>
          </span>
          <button
            type="button"
            data-skill-toggle-all="true"
            onClick={(event) => {
              stopRowClick(event);
              startTransition(() => {
                void viewModel.toggleAllSkills();
              });
            }}
            style={selectionControlStyle(detail.skillSelection)}
          >
            {selectionLabel(detail.skillSelection, t)}
          </button>
        </div>
      </div>
      <div style={sidebarBlockStyle}>
        <h2 style={sidebarHeadingStyle}>{t("page.detail.skills")}</h2>
        <ul style={sidebarListStyle}>
          {detail.skills.map((skill) => (
            <li key={skill.id}>
              <div
                data-skill-id={skill.id}
                onClick={() => {
                  viewModel.selectSkill(skill.id);
                }}
                style={sidebarSkillButtonStyle(viewModel.selectedSkillId === skill.id && !viewModel.showingGroupOverview)}
              >
                <span style={sidebarTitleStackStyle}>
                  <span>{skill.title}</span>
                  <span style={sidebarMetaStyle}>{skill.id}</span>
                </span>
                <button
                  type="button"
                  data-skill-toggle-id={skill.id}
                  onClick={(event) => {
                    stopRowClick(event);
                    startTransition(() => {
                      void viewModel.toggleSkill(skill.id);
                    });
                  }}
                  style={selectionControlStyle(skill.isEnabled ? "full" : "empty")}
                >
                  {skill.isEnabled ? t("common.selection.on") : t("common.selection.off")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function stopRowClick(event: MouseEvent): void {
  event.stopPropagation();
}

function selectionLabel(selection: "empty" | "partial" | "full", t: (key: string) => string): string {
  if (selection === "full") {
    return t("common.selection.on");
  }
  if (selection === "partial") {
    return t("common.selection.partial");
  }
  return t("common.selection.off");
}

const sidebarStyle: CSSProperties = {
  width: "280px",
  minWidth: "280px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "18px",
  borderRadius: "10px",
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    minHeight: "54px",
    padding: "0 14px",
    borderRadius: "8px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(224, 242, 254, 0.88)" : "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "default",
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
    borderRadius: "8px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.16)",
    background: active ? "rgba(224, 242, 254, 0.9)" : "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    textAlign: "left",
    cursor: "default",
  };
}

const sidebarTitleStackStyle: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  overflow: "hidden",
};

const sidebarMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function selectionControlStyle(selection: "empty" | "partial" | "full"): CSSProperties {
  const active = selection === "full";
  return {
    flex: "0 0 auto",
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "0",
    background:
      selection === "partial"
        ? "rgba(254, 249, 195, 0.92)"
        : active
        ? "rgba(204, 251, 241, 0.92)"
        : "rgba(226, 232, 240, 0.9)",
    color: active ? "#0f766e" : "#475569",
    fontSize: "10px",
    fontWeight: 800,
  };
}

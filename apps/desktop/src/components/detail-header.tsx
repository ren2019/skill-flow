import type { CSSProperties } from "react";
import { startTransition } from "react";
import { resolveActionIcon } from "../icons/action-icons";
import { resolveGroupCardIcon, type GroupCardIconId } from "../icons/group-card-icons";
import { localize } from "../i18n";
import { DetailViewModel } from "../view-models/detail-view-model";
import { DetailInfoRow } from "./detail-info-row";

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
  const detail = viewModel.presentedDetail;

  if (!detail) {
    return null;
  }
  const selectedSkill = viewModel.showingGroupOverview
    ? undefined
    : detail.skills.find((skill) => skill.id === viewModel.selectedSkillId) ?? detail.skills[0];
  const title = selectedSkill?.title ?? detail.title;
  const author = detail.author ?? "@unknown";
  const selectedSkillDocument = viewModel.showingGroupOverview ? undefined : viewModel.selectedSkillDocument;

  return (
    <header data-view="detail-header" style={headerStyle}>
      <div style={headerContentStyle}>
        <div style={titleRowStyle}>
          <h1 style={titleStyle}>{title}</h1>
          <span style={bylineStyle}>{formatDetailByline(author, viewModel.desktopLanguage)}</span>
        </div>
        {viewModel.showingGroupOverview ? (
          <button
            type="button"
            data-detail-update-current="true"
            aria-label={localize("action.update", viewModel.desktopLanguage)}
            disabled={viewModel.isUpdatingCurrentGroup}
            onClick={() => {
              startTransition(() => {
                void viewModel.updateCurrentGroup();
              });
            }}
            style={updateButtonStyle(viewModel.isUpdatingCurrentGroup)}
          >
            <img
              src={resolveActionIcon("update")}
              alt=""
              aria-hidden="true"
              style={updateIconStyle(viewModel.isUpdatingCurrentGroup)}
            />
          </button>
        ) : null}
      </div>
      {viewModel.showingGroupOverview ? (
        <div data-view="detail-header-stats" style={statsRowStyle}>
          <DetailStat iconId="skills" value={formatCount(detail.totalSkillCount ?? detail.skills.length)} />
          {detail.downloadCount !== undefined ? <DetailStat iconId="download" value={formatCount(detail.downloadCount)} /> : null}
          {detail.starCount !== undefined ? <DetailStat iconId="star" value={formatCount(detail.starCount)} /> : null}
          {detail.repoUrl ? (
            <DetailIconStat
              iconId="github"
              title={detail.repoUrl}
              onClick={() => {
                startTransition(() => {
                  void viewModel.openRepository();
                });
              }}
            />
          ) : null}
          {detail.groupPath ? (
            <DetailIconStat
              iconId="local-file"
              title={detail.groupPath}
              onClick={() => {
                startTransition(() => {
                  void viewModel.openGroupPath();
                });
              }}
            />
          ) : null}
        </div>
      ) : (
        <div data-view="detail-header-stats" style={statsRowStyle}>
          {selectedSkill ? (
            <DetailInfoRow
              version={selectedSkill.version}
              documentContent={selectedSkill.documentContent ?? selectedSkillDocument?.content}
              fontSize={12}
            />
          ) : (
            <span style={emptyMetaStyle}> </span>
          )}
        </div>
      )}
    </header>
  );
}

function formatDetailByline(author: string, language: string): string {
  return localize("detail.meta.by", language).replace("%@", author);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function DetailStat({ iconId, value }: { iconId: GroupCardIconId; value: string }) {
  return (
    <span data-detail-header-stat={iconId} style={statItemStyle}>
      <img src={resolveGroupCardIcon(iconId)} alt="" aria-hidden="true" style={statIconStyle} />
      <span>{value}</span>
    </span>
  );
}

function DetailIconStat({ iconId, title, onClick }: { iconId: GroupCardIconId; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-detail-header-stat={iconId}
      data-detail-header-action={iconId}
      title={title}
      onClick={onClick}
      style={statButtonStyle}
    >
      <img src={resolveGroupCardIcon(iconId)} alt="" aria-hidden="true" style={statIconStyle} />
    </button>
  );
}

const headerStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  minHeight: "78px",
  padding: "14px",
  alignContent: "center",
  background: "rgba(255, 255, 255, 0.92)",
  boxShadow: "inset 0 -1px 0 rgba(148, 163, 184, 0.18)",
};

const headerContentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  minWidth: 0,
};

const titleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "6px",
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  margin: 0,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "21px",
  fontWeight: 400,
  color: "#2563eb",
};

const bylineStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "#64748b",
  whiteSpace: "nowrap",
};

const statsRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "16px",
};

const statItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "12px",
  fontWeight: 500,
  color: "#64748b",
};

const statButtonStyle: CSSProperties = {
  ...statItemStyle,
  minWidth: "18px",
  height: "18px",
  padding: 0,
  justifyContent: "center",
  border: 0,
  borderRadius: "6px",
  background: "transparent",
};

const statIconStyle: CSSProperties = {
  width: "11px",
  height: "11px",
  opacity: 0.72,
};

const emptyMetaStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
};

function updateButtonStyle(isUpdating: boolean): CSSProperties {
  return {
    width: "32px",
    height: "32px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "8px",
    background: isUpdating ? "rgba(224, 242, 254, 0.9)" : "rgba(248, 250, 252, 0.92)",
    opacity: isUpdating ? 0.72 : 1,
  };
}

function updateIconStyle(isUpdating: boolean): CSSProperties {
  return {
    width: "14px",
    height: "14px",
    transform: isUpdating ? "rotate(35deg)" : undefined,
    transition: "transform 160ms ease",
  };
}

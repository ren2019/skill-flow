import { useState, type CSSProperties } from "react";
import { IconButton } from "./icon-button";
import { resolveGroupCardIcon, type GroupCardIconId } from "../icons/group-card-icons";
import { desktopTheme, type DesktopAccentColor, type DesktopThemeMode } from "../theme/app-theme";
import type { InventorySummaryState, WorkspaceTagPreference } from "../store/workspace-state";

type SharedGroupCardProps = {
  card: InventorySummaryState;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  pinned: boolean;
  skillsCollapsed?: boolean;
  onOpen(): void;
  onUpdate(): void;
  onTogglePinned(): void;
  onDelete(): void;
  onToggleSkill(skillId: string): void;
  onToggleAllSkills(): void;
  onToggleTarget(targetId: string): void;
  onToggleAllTargets(): void;
  groupTagItems: WorkspaceTagPreference[];
  groupTagSuggestions: WorkspaceTagPreference[];
  canCreateGroupTag: boolean;
  canDeleteGroupTags: boolean;
  onCreateGroupTag(title: string, accent?: DesktopAccentColor): void;
  onDeleteGroupTag(tagId: string): void;
  onSelectGroupTag(tagId: string): void;
  labels: {
    update: string;
    delete: string;
    all: string;
    pin: string;
    unpin: string;
    pinned: string;
    agents: string;
    skills: string;
    tags: string;
    addTag: string;
    tagPlaceholder: string;
    activeTargets(count: number): string;
    enabledSkills(count: number, totalCount: number): string;
  };
};

export function SharedGroupCard({
  card,
  themeMode,
  themeAccent,
  pinned,
  skillsCollapsed = false,
  onOpen,
  onUpdate,
  onTogglePinned,
  onDelete,
  onToggleSkill,
  onToggleAllSkills,
  onToggleTarget,
  onToggleAllTargets,
  groupTagItems,
  groupTagSuggestions,
  canCreateGroupTag,
  canDeleteGroupTags,
  onCreateGroupTag,
  onDeleteGroupTag,
  onSelectGroupTag,
  labels,
}: SharedGroupCardProps) {
  return (
    <article data-view="shared-group-card" style={cardStyle(themeMode)}>
      <header data-view="shared-group-card-header" style={headerStyle}>
        <div style={headerCopyStyle}>
          <button type="button" data-source-id={card.sourceId} onClick={onOpen} style={titleButtonStyle(themeAccent, themeMode)}>
            {card.title}
          </button>
          <p style={subtitleStyle(themeMode)}>{card.byline ?? card.locator}</p>
        </div>
        <div style={headerActionStyle}>
          <IconButton
            icon={pinned ? "pin" : "more"}
            label={pinned ? labels.unpin : labels.pin}
            active={pinned}
            onClick={onTogglePinned}
          />
        </div>
      </header>

      <div data-view="shared-group-card-stats" style={statsRowStyle(themeMode)}>
        <MetadataIcon icon="skills" label={`${card.skillCount} skills`} statId="skills" />
        {card.downloadCount !== undefined ? (
          <MetadataIcon icon="download" label={formatCount(card.downloadCount)} statId="download" />
        ) : null}
        {card.starCount !== undefined ? (
          <MetadataIcon icon="star" label={formatCount(card.starCount)} statId="star" />
        ) : null}
        {card.repoUrl ? (
          <MetadataLink icon="github" href={card.repoUrl} statId="github" />
        ) : null}
        {card.groupPath ? (
          <MetadataLink icon="local-file" href={card.groupPath} statId="local-file" />
        ) : null}
        <MetadataPill label={labels.activeTargets(card.activeTargetCount)} themeMode={themeMode} />
        {card.warningCount > 0 ? (
          <MetadataPill label={`${card.warningCount} warnings`} themeMode={themeMode} tone="warning" />
        ) : null}
        {card.errorCount > 0 ? (
          <MetadataPill label={`${card.errorCount} errors`} themeMode={themeMode} tone="error" />
        ) : null}
      </div>

      <div style={dividerStyle(themeMode)} />

      <section data-view="shared-group-card-tags" style={sectionStyle}>
        <SectionLabel label={labels.tags} themeMode={themeMode} />
        <GroupTagSection
          sourceId={card.sourceId}
          items={groupTagItems}
          suggestions={groupTagSuggestions}
          canCreate={canCreateGroupTag}
          canDelete={canDeleteGroupTags}
          themeMode={themeMode}
          themeAccent={themeAccent}
          addLabel={labels.addTag}
          placeholder={labels.tagPlaceholder}
          onCreate={onCreateGroupTag}
          onDelete={onDeleteGroupTag}
          onSelect={onSelectGroupTag}
        />
      </section>

      <section data-view="shared-group-card-agents" style={sectionStyle}>
        <SectionLabel label={labels.agents} themeMode={themeMode} />
        <div style={chipRowStyle}>
          {(card.targets ?? []).length > 0 ? (
            <>
              <ToggleChip
                label={labels.all}
                selected={card.targetSelection === "full"}
                partial={card.targetSelection === "partial"}
                themeMode={themeMode}
                accent={themeAccent}
                onClick={onToggleAllTargets}
                dataProps={{ "data-target-toggle-all-source-id": card.sourceId }}
              />
              {(card.targets ?? []).map((target) => (
                <ToggleChip
                  key={target.id}
                  label={target.shortLabel || target.label}
                  ariaLabel={target.label}
                  selected={target.isEnabled}
                  themeMode={themeMode}
                  accent={themeAccent}
                  onClick={() => {
                    onToggleTarget(target.id);
                  }}
                  dataProps={{ "data-target-toggle-id": `${card.sourceId}:${target.id}` }}
                />
              ))}
            </>
          ) : (card.enabledTargetLabels ?? []).length > 0
            ? (card.enabledTargetLabels ?? []).map((label) => (
              <InfoChip key={label} label={label} themeMode={themeMode} />
            ))
            : <InfoChip label={labels.activeTargets(card.activeTargetCount)} themeMode={themeMode} />}
        </div>
      </section>

      <section data-view="shared-group-card-skills" style={sectionStyle}>
        <SectionLabel label={labels.skills} themeMode={themeMode} />
        <div style={chipRowStyle}>
          {(card.skills ?? []).length > 0 && !skillsCollapsed ? (
            <>
              <ToggleChip
                label={labels.all}
                selected={card.skillSelection === "full"}
                partial={card.skillSelection === "partial"}
                themeMode={themeMode}
                accent={themeAccent}
                onClick={onToggleAllSkills}
                dataProps={{ "data-skill-toggle-all-source-id": card.sourceId }}
              />
              {(card.skills ?? []).slice(0, 6).map((skill) => (
                <ToggleChip
                  key={skill.id}
                  label={skill.title}
                  ariaLabel={skill.title}
                  selected={skill.isEnabled}
                  themeMode={themeMode}
                  accent={themeAccent}
                  onClick={() => {
                    onToggleSkill(skill.id);
                  }}
                  dataProps={{ "data-skill-toggle-id": `${card.sourceId}:${skill.id}` }}
                />
              ))}
            </>
          ) : skillsCollapsed ? (
            <InfoChip
              label={labels.enabledSkills(card.enabledSkillCount, card.skillCount)}
              themeMode={themeMode}
            />
          ) : (card.selectedSkillNames ?? []).length > 0
            ? (card.selectedSkillNames ?? []).slice(0, 4).map((label) => (
              <InfoChip key={label} label={label} themeMode={themeMode} />
            ))
            : (
              <InfoChip
                label={labels.enabledSkills(card.enabledSkillCount, card.skillCount)}
                themeMode={themeMode}
              />
            )}
          {pinned ? (
            <InfoChip label={labels.pinned} themeMode={themeMode} accent={themeAccent} />
          ) : null}
        </div>
      </section>

      <footer style={footerStyle}>
        <button
          type="button"
          data-update-source-id={card.sourceId}
          onClick={onUpdate}
          style={updateButtonStyle(themeAccent, themeMode)}
        >
          {labels.update}
        </button>
        <button
          type="button"
          data-pin-source-id={card.sourceId}
          onClick={onTogglePinned}
          style={secondaryButtonStyle(pinned, themeMode)}
        >
          {pinned ? labels.unpin : labels.pin}
        </button>
        <button
          type="button"
          data-delete-source-id={card.sourceId}
          onClick={onDelete}
          style={secondaryButtonStyle(false, themeMode)}
        >
          {labels.delete}
        </button>
      </footer>
    </article>
  );
}

function MetadataIcon({ icon, label, statId }: { icon: GroupCardIconId; label: string; statId: string }) {
  return (
    <span data-group-card-stat={statId} style={metadataIconWrapStyle}>
      <img src={resolveGroupCardIcon(icon)} alt="" aria-hidden="true" style={metadataIconStyle} />
      <span>{label}</span>
    </span>
  );
}

function MetadataLink({ icon, href, statId }: { icon: GroupCardIconId; href: string; statId: string }) {
  return (
    <a
      data-group-card-stat={statId}
      href={href}
      style={metadataLinkStyle}
      target="_blank"
      rel="noreferrer"
    >
      <img src={resolveGroupCardIcon(icon)} alt="" aria-hidden="true" style={metadataIconStyle} />
    </a>
  );
}

function MetadataPill(
  { label, themeMode, tone = "default" }: { label: string; themeMode: DesktopThemeMode; tone?: "default" | "warning" | "error" },
) {
  return <span style={metadataPillStyle(themeMode, tone)}>{label}</span>;
}

function SectionLabel({ label, themeMode }: { label: string; themeMode: DesktopThemeMode }) {
  return <p style={sectionLabelStyle(themeMode)}>{label}</p>;
}

function InfoChip(
  { label, themeMode, accent }: { label: string; themeMode: DesktopThemeMode; accent?: DesktopAccentColor },
) {
  return <span style={infoChipStyle(themeMode, accent)}>{label}</span>;
}

function ToggleChip({
  label,
  ariaLabel,
  selected,
  partial = false,
  themeMode,
  accent,
  onClick,
  dataProps,
}: {
  label: string;
  ariaLabel?: string;
  selected: boolean;
  partial?: boolean;
  themeMode: DesktopThemeMode;
  accent: DesktopAccentColor;
  onClick(): void;
  dataProps: Record<string, string>;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      style={toggleChipStyle(themeMode, accent, selected, partial)}
      {...dataProps}
    >
      {label}
    </button>
  );
}

export function GroupTagSection({
  sourceId,
  items,
  suggestions,
  canCreate,
  canDelete,
  themeMode,
  themeAccent,
  addLabel,
  placeholder,
  onCreate,
  onDelete,
  onSelect,
}: {
  sourceId: string;
  items: WorkspaceTagPreference[];
  suggestions: WorkspaceTagPreference[];
  canCreate: boolean;
  canDelete: boolean;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  addLabel: string;
  placeholder: string;
  onCreate(title: string, accent?: DesktopAccentColor): void;
  onDelete(tagId: string): void;
  onSelect(tagId: string): void;
}) {
  const [draft, setDraft] = useState("");
  const submitDraft = (title: string, accent?: DesktopAccentColor) => {
    onCreate(title, accent);
    setDraft("");
  };

  return (
    <div style={tagSectionStyle}>
      <div style={chipRowStyle}>
        {items.map((item) => (
          <span key={item.id} style={tagPillWrapStyle}>
            <button
              type="button"
              data-group-tag-id={`${sourceId}:${item.id}`}
              onClick={() => {
                onSelect(item.id);
              }}
              style={tagPillStyle(themeMode, (item.accent as DesktopAccentColor | undefined) ?? themeAccent)}
            >
              #{item.title}
            </button>
            {canDelete ? (
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                data-delete-group-tag-id={`${sourceId}:${item.id}`}
                onClick={() => {
                  onDelete(item.id);
                }}
                style={tagDeleteButtonStyle(themeMode, (item.accent as DesktopAccentColor | undefined) ?? themeAccent)}
              >
                x
              </button>
            ) : null}
          </span>
        ))}
      </div>

      {canCreate ? (
        <div style={tagInputRowStyle}>
          <input
            data-group-tag-input-source-id={sourceId}
            value={draft}
            placeholder={placeholder}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitDraft(draft);
              }
            }}
            style={tagInputStyle(themeMode)}
          />
          <button
            type="button"
            data-add-group-tag-source-id={sourceId}
            onClick={() => {
              submitDraft(draft);
            }}
            style={tagAddButtonStyle(themeMode, themeAccent)}
          >
            {addLabel}
          </button>
          {suggestions.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              data-group-tag-suggestion-id={`${sourceId}:${item.id}`}
              onClick={() => {
                submitDraft(item.title, item.accent as DesktopAccentColor | undefined);
              }}
              style={tagPillStyle(themeMode, (item.accent as DesktopAccentColor | undefined) ?? themeAccent)}
            >
              #{item.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const cardStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  minHeight: "206px",
  padding: "12px",
  borderRadius: "10px",
  background: themeMode === "light" ? "rgb(250, 250, 250)" : "rgb(20, 20, 20)",
  border: `0.5px solid ${desktopTheme.cardBorder(themeMode)}`,
  boxShadow: `0 12px 24px ${desktopTheme.cardShadow(themeMode)}`,
});

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
};

const headerCopyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  flex: 1,
  minWidth: 0,
};

const headerActionStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
};

const titleButtonStyle = (themeAccent: DesktopAccentColor, themeMode: DesktopThemeMode): CSSProperties => ({
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  textAlign: "left",
  fontSize: "21px",
  fontWeight: 400,
  lineHeight: 1.15,
  color: desktopTheme.brand(themeAccent, themeMode),
});

const subtitleStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  margin: 0,
  fontSize: "12px",
  color: desktopTheme.textMuted(themeMode),
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const statsRowStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "16px",
  color: desktopTheme.textMuted(themeMode),
  fontSize: "12px",
  flexWrap: "wrap",
});

const metadataIconWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
};

const metadataLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "14px",
  height: "14px",
};

const metadataIconStyle: CSSProperties = {
  width: "12px",
  height: "12px",
  objectFit: "contain",
};

const metadataPillStyle = (themeMode: DesktopThemeMode, tone: "default" | "warning" | "error"): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  height: "18px",
  padding: "0 8px",
  borderRadius: "999px",
  background: tone === "warning"
    ? "rgba(245, 158, 11, 0.14)"
    : tone === "error"
    ? "rgba(239, 68, 68, 0.14)"
    : themeMode === "light"
    ? "rgba(226, 232, 240, 0.7)"
    : "rgba(255, 255, 255, 0.08)",
  color: tone === "warning" ? "#b45309" : tone === "error" ? "#b91c1c" : desktopTheme.textMuted(themeMode),
  fontSize: "11px",
  fontWeight: 500,
});

const dividerStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  borderTop: `1px dashed ${themeMode === "light" ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.14)"}`,
});

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const sectionLabelStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  margin: 0,
  fontSize: "12px",
  fontWeight: 600,
  color: desktopTheme.textPrimary(themeMode),
});

const chipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const tagSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const tagPillWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "24px",
};

const tagPillStyle = (themeMode: DesktopThemeMode, accent: DesktopAccentColor): CSSProperties => ({
  border: "none",
  background: "transparent",
  padding: "3px 8px",
  color: desktopTheme.brand(accent, themeMode),
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
});

const tagDeleteButtonStyle = (themeMode: DesktopThemeMode, accent: DesktopAccentColor): CSSProperties => ({
  border: "none",
  background: "transparent",
  width: "20px",
  height: "20px",
  padding: 0,
  color: desktopTheme.brand(accent, themeMode),
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
});

const tagInputRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "6px",
};

const tagInputStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  width: "98px",
  height: "24px",
  padding: "0 8px",
  borderRadius: "6px",
  border: `1px solid ${desktopTheme.cardBorder(themeMode)}`,
  background: themeMode === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.08)",
  color: desktopTheme.textPrimary(themeMode),
  fontSize: "12px",
});

const tagAddButtonStyle = (themeMode: DesktopThemeMode, accent: DesktopAccentColor): CSSProperties => ({
  height: "24px",
  padding: "0 8px",
  borderRadius: "6px",
  border: "none",
  background: `${desktopTheme.brand(accent, themeMode)}20`,
  color: desktopTheme.brand(accent, themeMode),
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
});

const infoChipStyle = (themeMode: DesktopThemeMode, accent?: DesktopAccentColor): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: accent ? `${desktopTheme.brand(accent, themeMode)}20` : themeMode === "light" ? "rgba(241, 245, 249, 0.95)" : "rgba(255, 255, 255, 0.08)",
  border: `1px solid ${accent ? `${desktopTheme.brand(accent, themeMode)}55` : themeMode === "light" ? "rgba(203, 213, 225, 0.9)" : "rgba(255, 255, 255, 0.12)"}`,
  color: accent ? desktopTheme.brand(accent, themeMode) : desktopTheme.textPrimary(themeMode),
  fontSize: "12px",
  fontWeight: 600,
});

const toggleChipStyle = (
  themeMode: DesktopThemeMode,
  accent: DesktopAccentColor,
  selected: boolean,
  partial: boolean,
): CSSProperties => ({
  ...infoChipStyle(themeMode, selected || partial ? accent : undefined),
  border: "none",
  cursor: "pointer",
  opacity: selected ? 1 : partial ? 0.88 : 0.58,
});

const footerStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "auto",
};

const updateButtonStyle = (themeAccent: DesktopAccentColor, themeMode: DesktopThemeMode): CSSProperties => ({
  height: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: "none",
  background: desktopTheme.brand(themeAccent, themeMode),
  color: themeMode === "light" ? "#ffffff" : "#111827",
  fontSize: "12px",
  fontWeight: 700,
});

const secondaryButtonStyle = (active: boolean, themeMode: DesktopThemeMode): CSSProperties => ({
  height: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: `1px solid ${active ? "rgba(13, 148, 136, 0.26)" : "rgba(148, 163, 184, 0.22)"}`,
  background: active ? "rgba(204, 251, 241, 0.88)" : themeMode === "light" ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.08)",
  color: desktopTheme.textPrimary(themeMode),
  fontSize: "12px",
  fontWeight: 600,
});

function formatCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

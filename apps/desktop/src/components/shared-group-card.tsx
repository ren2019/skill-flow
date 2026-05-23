import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IconButton } from "./icon-button";
import { resolveActionIcon, type ActionIconId } from "../icons/action-icons";
import { resolveGroupCardIcon, type GroupCardIconId } from "../icons/group-card-icons";
import { desktopTheme, type DesktopAccentColor, type DesktopThemeMode } from "../theme/app-theme";
import type { InventorySummaryState, WorkspaceTagPreference } from "../store/workspace-state";

export type RecommendationBadgeItem = {
  id: string;
  title: string;
  isPrimary: boolean;
};

export type GroupCardDisplayMode =
  | "homeComfortable"
  | "homeCompact"
  | "menuComfortable"
  | "menuCompact"
  | "importSearch"
  | "importRecommendation";

type GroupCardScale = {
  cardInset: number;
  cardSpacing: number;
  titleSize: number;
  metaSize: number;
  sectionLabelSize: number;
  chipHeight: number;
  chipFontSize: number;
  cornerRadius: number;
  shadowRadius: number;
  minHeight: number;
};

type GroupCardDisplayProfile = {
  scale: GroupCardScale;
  showsSubtitle: boolean;
  showsMetaLine: boolean;
  showsSectionTitles: boolean;
  supportsCollapsedSkills: boolean;
  showsHeaderDivider: boolean;
  showsSummaryDivider: boolean;
  reservesMinimumHeight: boolean;
  usesPlainPrimaryActionIcon: boolean;
  showsLoadingStatPlaceholders: boolean;
};

type SharedGroupCardProps = {
  card: InventorySummaryState;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  pinned: boolean;
  displayMode?: GroupCardDisplayMode;
  skillsCollapsed?: boolean;
  isUpdating?: boolean;
  actionButtonTitle?: string | undefined;
  actionButtonIcon?: ActionIconId;
  isActionButtonDisabled?: boolean;
  onActionButton?: (() => void) | undefined;
  onOpen?: (() => void) | undefined;
  onUpdate(): void;
  onTogglePinned(): void;
  onDelete(): void;
  onToggleSkill(skillId: string): void;
  onToggleAllSkills(): void;
  onToggleTarget(targetId: string): void;
  onToggleAllTargets(): void;
  onOpenRepository?(url: string): void | Promise<void>;
  onOpenLocalPath?(path: string): void | Promise<void>;
  groupTagItems: WorkspaceTagPreference[];
  groupTagSuggestions: WorkspaceTagPreference[];
  canCreateGroupTag: boolean;
  canDeleteGroupTags: boolean;
  onCreateGroupTag(title: string, accent?: DesktopAccentColor): void;
  onDeleteGroupTag(tagId: string): void;
  onSelectGroupTag(tagId: string): void;
  recommendationBadgeItems?: RecommendationBadgeItem[];
  recommendationDescription?: string | undefined;
  labels: {
    update: string;
    delete: string;
    all: string;
    pin: string;
    unpin: string;
    pinned: string;
    import: string;
    updating: string;
    agents: string;
    skills: string;
    tags: string;
    addTag: string;
    editTags: string;
    cancelEditTags: string;
    deleteTags: string;
    doneDeleteTags: string;
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
  displayMode = "homeComfortable",
  skillsCollapsed = false,
  isUpdating = false,
  actionButtonTitle,
  actionButtonIcon = "import",
  isActionButtonDisabled = false,
  onActionButton,
  onOpen,
  onUpdate,
  onTogglePinned,
  onDelete,
  onToggleSkill,
  onToggleAllSkills,
  onToggleTarget,
  onToggleAllTargets,
  onOpenRepository,
  onOpenLocalPath,
  groupTagItems,
  groupTagSuggestions,
  canCreateGroupTag,
  canDeleteGroupTags,
  onCreateGroupTag,
  onDeleteGroupTag,
  onSelectGroupTag,
  recommendationBadgeItems = [],
  recommendationDescription,
  labels,
}: SharedGroupCardProps) {
  const profile = groupCardDisplayProfile(displayMode);
  const shouldRenderSkills = !profile.supportsCollapsedSkills || !skillsCollapsed;
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isDeletingTags, setIsDeletingTags] = useState(false);
  const shouldRenderTags = groupTagItems.length > 0 || canCreateGroupTag || isEditingTags;
  const shouldRenderRecommendationSummary = recommendationBadgeItems.length > 0 || Boolean(recommendationDescription);
  const shouldRenderSummary = shouldRenderTags || shouldRenderRecommendationSummary;
  const showsLoadingStatPlaceholders = profile.showsLoadingStatPlaceholders
    && (card.skillsLoading === true || card.targetsLoading === true);
  const isBusy = isUpdating;
  const showsPrimaryAction = onActionButton !== undefined;

  return (
    <article data-view="shared-group-card" data-card-display-mode={displayMode} style={cardStyle(themeMode, profile)}>
      <div style={cardContentStyle(isBusy)}>
      <header data-view="shared-group-card-header" style={headerStyle}>
        <div style={headerCopyStyle}>
          {onOpen ? (
            <button type="button" data-source-id={card.sourceId} disabled={isBusy} onClick={onOpen} style={titleButtonStyle(themeAccent, themeMode, profile)}>
              {card.title}
            </button>
          ) : (
            <span data-source-id={card.sourceId} style={titleTextStyle(themeAccent, themeMode, profile)}>
              {card.title}
            </span>
          )}
          {profile.showsSubtitle ? (
            <p style={subtitleStyle(themeMode, profile)}>{card.byline ?? card.locator}</p>
          ) : null}
        </div>
        <div style={headerActionStyle}>
          {showsPrimaryAction ? (
            <PrimaryActionButton
              icon={actionButtonIcon}
              title={actionButtonTitle ?? labels.import}
              plainIcon={profile.usesPlainPrimaryActionIcon}
              disabled={isBusy || isActionButtonDisabled}
              themeMode={themeMode}
              themeAccent={themeAccent}
              dataProps={{ "data-import-group-id": card.sourceId }}
              onClick={onActionButton}
            />
          ) : (
            <>
              <IconButton
            icon={pinned && !isActionMenuOpen ? "pin" : "more"}
            label={pinned ? labels.unpin : labels.pin}
            active={isActionMenuOpen || pinned}
            data-testid={`group-card-action-menu-${card.sourceId}`}
            disabled={isBusy}
            onClick={() => {
              setIsActionMenuOpen((current) => !current);
            }}
              />
              {isActionMenuOpen ? (
                <div data-view="shared-group-card-action-menu" style={actionMenuStyle(themeMode)}>
                  <ActionMenuButton
                icon="pin"
                label={pinned ? labels.unpin : labels.pin}
                themeMode={themeMode}
                dataProps={{ "data-pin-source-id": card.sourceId }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onTogglePinned();
                }}
              />
              <ActionMenuButton
                icon="update"
                label={labels.update}
                themeMode={themeMode}
                dataProps={{ "data-update-source-id": card.sourceId }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onUpdate();
                }}
              />
              <ActionMenuButton
                icon={isEditingTags ? "close" : "tag-add"}
                label={isEditingTags ? labels.cancelEditTags : labels.editTags}
                themeMode={themeMode}
                dataProps={{ "data-edit-tags-source-id": card.sourceId }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setIsDeletingTags(false);
                  setIsEditingTags((current) => !current);
                }}
              />
              {canDeleteGroupTags ? (
                <ActionMenuButton
                  icon={isDeletingTags ? "close" : "tag-delete"}
                  label={isDeletingTags ? labels.doneDeleteTags : labels.deleteTags}
                  themeMode={themeMode}
                  dataProps={{ "data-delete-tags-source-id": card.sourceId }}
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    setIsEditingTags(false);
                    setIsDeletingTags((current) => !current);
                  }}
                />
              ) : null}
              <ActionMenuButton
                icon="delete"
                label={labels.delete}
                themeMode={themeMode}
                tone="danger"
                dataProps={{ "data-delete-source-id": card.sourceId }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onDelete();
                }}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </header>

      {profile.showsMetaLine ? (
        <div data-view="shared-group-card-stats" style={statsRowStyle(themeMode, profile)}>
          {card.downloadCount !== undefined ? (
            <MetadataIcon icon="download" label={formatCount(card.downloadCount)} statId="download" />
          ) : showsLoadingStatPlaceholders ? <MetadataPlaceholder width={42} statId="download" themeMode={themeMode} /> : null}
          {card.starCount !== undefined ? (
            <MetadataIcon icon="star" label={formatCount(card.starCount)} statId="star" />
          ) : showsLoadingStatPlaceholders ? <MetadataPlaceholder width={38} statId="star" themeMode={themeMode} /> : null}
          {card.repoUrl ? (
            <MetadataLink icon="github" href={card.repoUrl} statId="github" onOpen={onOpenRepository} />
          ) : showsLoadingStatPlaceholders ? <MetadataPlaceholder width={16} statId="github" themeMode={themeMode} /> : null}
          {card.groupPath ? (
            <MetadataLink icon="local-file" href={card.groupPath} statId="local-file" onOpen={onOpenLocalPath} />
          ) : showsLoadingStatPlaceholders ? <MetadataPlaceholder width={16} statId="local-file" themeMode={themeMode} /> : null}
        </div>
      ) : null}

      {profile.showsHeaderDivider ? <div data-view="shared-group-card-header-divider" style={dividerStyle(themeMode)} /> : null}

      <section data-view="shared-group-card-agents" style={sectionStyle}>
        <SectionLabel label={labels.agents} themeMode={themeMode} profile={profile} />
        <div style={chipRowStyle}>
          {card.targetsLoading ? (
            <>
              <ToggleChip
                label={labels.all}
                selected={card.targetSelection === "full"}
                partial={card.targetSelection === "partial"}
                themeMode={themeMode}
                accent={themeAccent}
                profile={profile}
                onClick={onToggleAllTargets}
                dataProps={{ "data-target-toggle-all-source-id": card.sourceId }}
              />
              <LoadingPills count={3} profile={profile} themeMode={themeMode} />
            </>
          ) : (card.targets ?? []).length > 0 ? (
            <>
              <ToggleChip
                label={labels.all}
                selected={card.targetSelection === "full"}
                partial={card.targetSelection === "partial"}
                themeMode={themeMode}
                accent={themeAccent}
                profile={profile}
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
                  profile={profile}
                  onClick={() => {
                    onToggleTarget(target.id);
                  }}
                  dataProps={{ "data-target-toggle-id": `${card.sourceId}:${target.id}` }}
                />
              ))}
            </>
          ) : (card.enabledTargetLabels ?? []).length > 0
            ? (card.enabledTargetLabels ?? []).map((label) => (
              <InfoChip key={label} label={label} themeMode={themeMode} profile={profile} />
            ))
            : <InfoChip label={labels.activeTargets(card.activeTargetCount)} themeMode={themeMode} profile={profile} />}
        </div>
      </section>

      {shouldRenderSkills ? (
        <section data-view="shared-group-card-skills" style={sectionStyle}>
          <SectionLabel label={labels.skills} themeMode={themeMode} profile={profile} />
          <div style={chipRowStyle}>
            {card.skillsLoading ? (
              <>
                <ToggleChip
                  label={labels.all}
                  selected={card.skillSelection === "full"}
                  partial={card.skillSelection === "partial"}
                  themeMode={themeMode}
                  accent={themeAccent}
                  profile={profile}
                  onClick={onToggleAllSkills}
                  dataProps={{ "data-skill-toggle-all-source-id": card.sourceId }}
                />
                <LoadingPills count={3} profile={profile} themeMode={themeMode} />
              </>
            ) : (card.skills ?? []).length > 0 ? (
            <>
              <ToggleChip
                label={labels.all}
                selected={card.skillSelection === "full"}
                partial={card.skillSelection === "partial"}
                themeMode={themeMode}
                accent={themeAccent}
                profile={profile}
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
                  profile={profile}
                  onClick={() => {
                    onToggleSkill(skill.id);
                  }}
                  dataProps={{ "data-skill-toggle-id": `${card.sourceId}:${skill.id}` }}
                />
              ))}
            </>
          ) : (card.selectedSkillNames ?? []).length > 0
            ? (card.selectedSkillNames ?? []).slice(0, 4).map((label) => (
              <InfoChip key={label} label={label} themeMode={themeMode} profile={profile} />
            ))
            : (
              <InfoChip
                label={labels.enabledSkills(card.enabledSkillCount, card.skillCount)}
                themeMode={themeMode}
                profile={profile}
              />
            )}
          {pinned ? (
            <InfoChip label={labels.pinned} themeMode={themeMode} accent={themeAccent} profile={profile} />
          ) : null}
          </div>
        </section>
      ) : null}

      {shouldRenderSummary ? (
        <>
          {profile.showsSummaryDivider ? <div data-view="shared-group-card-summary-divider" style={dividerStyle(themeMode)} /> : null}
          {shouldRenderRecommendationSummary ? (
            <section data-view="shared-group-card-recommendation-summary" style={sectionStyle}>
              <RecommendationSummary
                badgeItems={recommendationBadgeItems}
                description={recommendationDescription}
                themeMode={themeMode}
              />
            </section>
          ) : (
            <section data-view="shared-group-card-tags" style={sectionStyle}>
              <SectionLabel label={labels.tags} themeMode={themeMode} profile={profile} />
              <GroupTagSection
                sourceId={card.sourceId}
                items={groupTagItems}
                suggestions={groupTagSuggestions}
                canCreate={canCreateGroupTag && isEditingTags}
                canStartEditing={canCreateGroupTag && !isEditingTags && !isDeletingTags}
                canDelete={canDeleteGroupTags && isDeletingTags}
                themeMode={themeMode}
                themeAccent={themeAccent}
                addLabel={labels.addTag}
                placeholder={labels.tagPlaceholder}
                onStartEditing={() => {
                  setIsDeletingTags(false);
                  setIsEditingTags(true);
                }}
                onCreate={(title, accent) => {
                  onCreateGroupTag(title, accent);
                  setIsEditingTags(false);
                }}
                onDelete={onDeleteGroupTag}
                onSelect={onSelectGroupTag}
              />
            </section>
          )}
        </>
      ) : null}

      </div>
      {isBusy ? (
        <div data-view="shared-group-card-busy-overlay" style={busyOverlayStyle(themeMode, profile)}>
          <span aria-hidden="true" style={busySpinnerStyle(themeAccent, themeMode)} />
          <span>{labels.updating}</span>
        </div>
      ) : null}
    </article>
  );
}

function ActionMenuButton({
  icon,
  label,
  themeMode,
  tone = "default",
  dataProps,
  onClick,
}: {
  icon: ActionIconId;
  label: string;
  themeMode: DesktopThemeMode;
  tone?: "default" | "danger";
  dataProps: Record<string, string>;
  onClick(): void;
}) {
  return (
    <button type="button" onClick={onClick} style={actionMenuButtonStyle(themeMode, tone)} {...dataProps}>
      <img src={resolveActionIcon(icon)} alt="" aria-hidden="true" style={actionMenuIconStyle} />
      <span>{label}</span>
    </button>
  );
}

function PrimaryActionButton({
  icon,
  title,
  plainIcon,
  disabled,
  themeMode,
  themeAccent,
  dataProps,
  onClick,
}: {
  icon: ActionIconId;
  title: string;
  plainIcon: boolean;
  disabled: boolean;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  dataProps: Record<string, string>;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={primaryActionButtonStyle(themeMode, themeAccent, plainIcon, disabled)}
      {...dataProps}
    >
      <img src={resolveActionIcon(icon)} alt="" aria-hidden="true" style={primaryActionIconStyle} />
      {plainIcon ? <span style={visuallyHiddenStyle}>{title}</span> : <span>{title}</span>}
    </button>
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

function MetadataLink({
  icon,
  href,
  statId,
  onOpen,
}: {
  icon: GroupCardIconId;
  href: string;
  statId: string;
  onOpen?: ((href: string) => void | Promise<void>) | undefined;
}) {
  if (onOpen) {
    return (
      <button
        type="button"
        data-group-card-stat={statId}
        data-group-card-stat-action={statId}
        aria-label={href}
        title={href}
        onClick={() => {
          void onOpen(href);
        }}
        style={metadataButtonStyle}
      >
        <img src={resolveGroupCardIcon(icon)} alt="" aria-hidden="true" style={metadataIconStyle} />
      </button>
    );
  }

  return (
    <a
      data-group-card-stat={statId}
      title={href}
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

function MetadataPlaceholder({
  width,
  statId,
  themeMode,
}: {
  width: number;
  statId: string;
  themeMode: DesktopThemeMode;
}) {
  return (
    <span
      data-group-card-stat-placeholder={statId}
      aria-hidden="true"
      style={metadataPlaceholderStyle(width, themeMode)}
    />
  );
}

function LoadingPills({
  count,
  profile,
  themeMode,
}: {
  count: number;
  profile: GroupCardDisplayProfile;
  themeMode: DesktopThemeMode;
}) {
  return Array.from({ length: count }, (_, index) => (
    <span
      key={index}
      data-view="shared-group-card-loading-pill"
      aria-hidden="true"
      style={loadingPillStyle(themeMode, profile)}
    />
  ));
}

function RecommendationSummary({
  badgeItems,
  description,
  themeMode,
}: {
  badgeItems: RecommendationBadgeItem[];
  description?: string | undefined;
  themeMode: DesktopThemeMode;
}) {
  return (
    <div style={recommendationSummaryStyle}>
      {badgeItems.length > 0 ? (
        <div data-view="shared-group-card-recommendation-badges" style={chipRowStyle}>
          {badgeItems.map((badge) => (
            <span
              key={`${badge.id}:${badge.title}`}
              style={recommendationBadgeStyle(themeMode, recommendationBadgeAccent(badge.id))}
            >
              #{badge.title}
            </span>
          ))}
        </div>
      ) : null}
      {description ? (
        <p data-view="shared-group-card-recommendation-description" style={recommendationDescriptionStyle(themeMode)}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

function SectionLabel(
  { label, themeMode, profile }: { label: string; themeMode: DesktopThemeMode; profile: GroupCardDisplayProfile },
) {
  if (!profile.showsSectionTitles) {
    return null;
  }
  return <p style={sectionLabelStyle(themeMode, profile)}>{label}</p>;
}

function InfoChip(
  {
    label,
    themeMode,
    profile,
    accent,
  }: { label: string; themeMode: DesktopThemeMode; profile: GroupCardDisplayProfile; accent?: DesktopAccentColor },
) {
  return <span style={infoChipStyle(themeMode, profile, accent)}>{label}</span>;
}

function ToggleChip({
  label,
  ariaLabel,
  selected,
  partial = false,
  themeMode,
  accent,
  profile,
  onClick,
  dataProps,
}: {
  label: string;
  ariaLabel?: string;
  selected: boolean;
  partial?: boolean;
  themeMode: DesktopThemeMode;
  accent: DesktopAccentColor;
  profile: GroupCardDisplayProfile;
  onClick(): void;
  dataProps: Record<string, string>;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      style={toggleChipStyle(themeMode, accent, profile, selected, partial)}
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
  canStartEditing,
  canDelete,
  themeMode,
  themeAccent,
  addLabel,
  placeholder,
  onCreate,
  onStartEditing,
  onDelete,
  onSelect,
}: {
  sourceId: string;
  items: WorkspaceTagPreference[];
  suggestions: WorkspaceTagPreference[];
  canCreate: boolean;
  canStartEditing: boolean;
  canDelete: boolean;
  themeMode: DesktopThemeMode;
  themeAccent: DesktopAccentColor;
  addLabel: string;
  placeholder: string;
  onCreate(title: string, accent?: DesktopAccentColor): void;
  onStartEditing(): void;
  onDelete(tagId: string): void;
  onSelect(tagId: string): void;
}) {
  const [draft, setDraft] = useState("");
  const [hoveredTagId, setHoveredTagId] = useState<string | undefined>(undefined);
  const hoverCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submitDraft = (title: string, accent?: DesktopAccentColor) => {
    onCreate(title, accent);
    setDraft("");
  };
  const clearHoverCollapse = () => {
    if (hoverCollapseTimerRef.current) {
      clearTimeout(hoverCollapseTimerRef.current);
      hoverCollapseTimerRef.current = undefined;
    }
  };
  const scheduleHoverCollapse = () => {
    clearHoverCollapse();
    hoverCollapseTimerRef.current = setTimeout(() => {
      setHoveredTagId(undefined);
      hoverCollapseTimerRef.current = undefined;
    }, 1000);
  };
  const showsHoverAddButton = canStartEditing && (items.length === 0 || hoveredTagId !== undefined);

  useEffect(() => () => clearHoverCollapse(), []);

  if (canCreate) {
    return (
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
        <span aria-hidden="true" style={tagInputDividerStyle(themeMode)} />
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
    );
  }

  return (
    <div style={tagSectionStyle}>
      <div style={chipRowStyle}>
        {canStartEditing ? (
          <button
            type="button"
            aria-label={addLabel}
            data-start-edit-group-tags-source-id={sourceId}
            onClick={onStartEditing}
            onMouseEnter={clearHoverCollapse}
            onMouseLeave={scheduleHoverCollapse}
            style={tagHoverAddButtonStyle(themeMode, themeAccent, showsHoverAddButton)}
          >
            <img src={resolveActionIcon("plus")} alt="" aria-hidden="true" style={tagHoverAddIconStyle} />
          </button>
        ) : null}
        {items.map((item) => (
          <span
            key={item.id}
            style={tagPillWrapStyle}
            onMouseEnter={() => {
              clearHoverCollapse();
              setHoveredTagId(item.id);
            }}
            onMouseLeave={scheduleHoverCollapse}
          >
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
    </div>
  );
}

function groupCardDisplayProfile(displayMode: GroupCardDisplayMode): GroupCardDisplayProfile {
  const homeScale: GroupCardScale = {
    cardInset: 12,
    cardSpacing: 10,
    titleSize: 21,
    metaSize: 12,
    sectionLabelSize: 12,
    chipHeight: 34,
    chipFontSize: 12,
    cornerRadius: 10,
    shadowRadius: 16,
    minHeight: 206,
  };
  const menuScale: GroupCardScale = {
    ...homeScale,
    cardInset: 9.6,
    cardSpacing: 8,
    cornerRadius: 8,
    shadowRadius: 12.8,
    minHeight: 165,
  };
  switch (displayMode) {
    case "homeCompact":
      return {
        scale: homeScale,
        showsSubtitle: true,
        showsMetaLine: false,
        showsSectionTitles: false,
        supportsCollapsedSkills: false,
        showsHeaderDivider: false,
        showsSummaryDivider: false,
        reservesMinimumHeight: false,
        usesPlainPrimaryActionIcon: false,
        showsLoadingStatPlaceholders: false,
      };
    case "menuComfortable":
      return {
        scale: menuScale,
        showsSubtitle: true,
        showsMetaLine: true,
        showsSectionTitles: false,
        supportsCollapsedSkills: true,
        showsHeaderDivider: false,
        showsSummaryDivider: false,
        reservesMinimumHeight: false,
        usesPlainPrimaryActionIcon: false,
        showsLoadingStatPlaceholders: false,
      };
    case "menuCompact":
      return {
        scale: menuScale,
        showsSubtitle: true,
        showsMetaLine: false,
        showsSectionTitles: false,
        supportsCollapsedSkills: true,
        showsHeaderDivider: false,
        showsSummaryDivider: false,
        reservesMinimumHeight: false,
        usesPlainPrimaryActionIcon: false,
        showsLoadingStatPlaceholders: false,
      };
    case "importSearch":
      return {
        scale: homeScale,
        showsSubtitle: true,
        showsMetaLine: true,
        showsSectionTitles: true,
        supportsCollapsedSkills: false,
        showsHeaderDivider: true,
        showsSummaryDivider: false,
        reservesMinimumHeight: true,
        usesPlainPrimaryActionIcon: true,
        showsLoadingStatPlaceholders: true,
      };
    case "importRecommendation":
      return {
        scale: homeScale,
        showsSubtitle: true,
        showsMetaLine: true,
        showsSectionTitles: true,
        supportsCollapsedSkills: false,
        showsHeaderDivider: true,
        showsSummaryDivider: true,
        reservesMinimumHeight: true,
        usesPlainPrimaryActionIcon: true,
        showsLoadingStatPlaceholders: true,
      };
    case "homeComfortable":
    default:
      return {
        scale: homeScale,
        showsSubtitle: true,
        showsMetaLine: true,
        showsSectionTitles: true,
        supportsCollapsedSkills: false,
        showsHeaderDivider: true,
        showsSummaryDivider: true,
        reservesMinimumHeight: true,
        usesPlainPrimaryActionIcon: false,
        showsLoadingStatPlaceholders: false,
      };
  }
}

function recommendationBadgeAccent(tagId: string): DesktopAccentColor {
  switch (tagId) {
    case "development":
      return "green";
    case "design":
      return "pink";
    case "creation":
    case "automation":
      return "orange";
    case "marketing":
      return "purple";
    case "research":
      return "yellow";
    case "general":
    case "teamwork":
    default:
      return "blue";
  }
}

const cardStyle = (themeMode: DesktopThemeMode, profile: GroupCardDisplayProfile): CSSProperties => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: `${profile.scale.cardSpacing}px`,
  ...(profile.reservesMinimumHeight ? { minHeight: `${profile.scale.minHeight}px` } : {}),
  padding: `${profile.scale.cardInset}px`,
  borderRadius: `${profile.scale.cornerRadius}px`,
  background: themeMode === "light" ? "rgb(250, 250, 250)" : "rgb(20, 20, 20)",
  border: `0.5px solid ${desktopTheme.cardBorder(themeMode)}`,
  boxShadow: `0 ${profile.scale.shadowRadius * 0.75}px ${profile.scale.shadowRadius * 1.5}px ${desktopTheme.cardShadow(themeMode)}`,
});

const cardContentStyle = (isBusy: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: "inherit",
  opacity: isBusy ? 0.34 : 1,
  filter: isBusy ? "blur(0.8px)" : "none",
  pointerEvents: isBusy ? "none" : "auto",
});

const busyOverlayStyle = (themeMode: DesktopThemeMode, profile: GroupCardDisplayProfile): CSSProperties => ({
  position: "absolute",
  inset: 0,
  zIndex: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  borderRadius: `${profile.scale.cornerRadius}px`,
  background: themeMode === "light" ? "rgba(255, 255, 255, 0.64)" : "rgba(0, 0, 0, 0.24)",
  color: desktopTheme.textPrimary(themeMode),
  fontSize: `${profile.scale.metaSize}px`,
  fontWeight: 600,
});

const busySpinnerStyle = (themeAccent: DesktopAccentColor, themeMode: DesktopThemeMode): CSSProperties => ({
  width: "14px",
  height: "14px",
  borderRadius: "999px",
  border: `2px solid ${desktopTheme.cardBorder(themeMode)}`,
  borderTopColor: desktopTheme.brand(themeAccent, themeMode),
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
  position: "relative",
};

const actionMenuStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  position: "absolute",
  right: 0,
  top: "34px",
  zIndex: 5,
  width: "176px",
  display: "grid",
  gap: "4px",
  padding: "6px",
  borderRadius: "8px",
  background: desktopTheme.pageBackground(themeMode),
  boxShadow: `0 12px 30px ${desktopTheme.cardShadow(themeMode)}`,
});

const actionMenuButtonStyle = (themeMode: DesktopThemeMode, tone: "default" | "danger"): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  minHeight: "30px",
  padding: "0 8px",
  border: "none",
  borderRadius: "6px",
  background: "transparent",
  color: tone === "danger"
    ? themeMode === "light" ? "#b91c1c" : "#f87171"
    : desktopTheme.textPrimary(themeMode),
  fontSize: "12px",
  fontWeight: 600,
  textAlign: "left",
  cursor: "pointer",
});

const actionMenuIconStyle: CSSProperties = {
  width: "13px",
  height: "13px",
  objectFit: "contain",
};

const primaryActionButtonStyle = (
  themeMode: DesktopThemeMode,
  themeAccent: DesktopAccentColor,
  plainIcon: boolean,
  disabled: boolean,
): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  minWidth: plainIcon ? "30px" : "auto",
  width: plainIcon ? "30px" : "auto",
  height: "30px",
  padding: plainIcon ? 0 : "0 10px",
  border: "none",
  borderRadius: "7px",
  background: disabled ? desktopTheme.headerControlFill(themeMode) : desktopTheme.brand(themeAccent, themeMode),
  color: disabled ? desktopTheme.textMuted(themeMode) : "#ffffff",
  fontSize: "12px",
  fontWeight: 700,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.62 : 1,
});

const primaryActionIconStyle: CSSProperties = {
  width: "14px",
  height: "14px",
  objectFit: "contain",
};

const visuallyHiddenStyle: CSSProperties = {
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

const titleButtonStyle = (
  themeAccent: DesktopAccentColor,
  themeMode: DesktopThemeMode,
  profile: GroupCardDisplayProfile,
): CSSProperties => ({
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  textAlign: "left",
  fontSize: `${profile.scale.titleSize}px`,
  fontWeight: 400,
  lineHeight: 1.15,
  color: desktopTheme.brand(themeAccent, themeMode),
});

const titleTextStyle = (
  themeAccent: DesktopAccentColor,
  themeMode: DesktopThemeMode,
  profile: GroupCardDisplayProfile,
): CSSProperties => ({
  ...titleButtonStyle(themeAccent, themeMode, profile),
  display: "block",
});

const subtitleStyle = (themeMode: DesktopThemeMode, profile: GroupCardDisplayProfile): CSSProperties => ({
  margin: 0,
  fontSize: `${profile.scale.metaSize}px`,
  color: desktopTheme.textMuted(themeMode),
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const statsRowStyle = (themeMode: DesktopThemeMode, profile: GroupCardDisplayProfile): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: `${profile.scale.metaSize + 4}px`,
  color: desktopTheme.textMuted(themeMode),
  fontSize: `${profile.scale.metaSize}px`,
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

const metadataButtonStyle: CSSProperties = {
  ...metadataLinkStyle,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
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

const metadataPlaceholderStyle = (width: number, themeMode: DesktopThemeMode): CSSProperties => ({
  display: "inline-flex",
  width: `${width}px`,
  height: "10px",
  borderRadius: "5px",
  background: themeMode === "light" ? "rgba(212, 212, 216, 0.7)" : "rgba(255, 255, 255, 0.14)",
});

const loadingPillStyle = (themeMode: DesktopThemeMode, profile: GroupCardDisplayProfile): CSSProperties => ({
  display: "inline-flex",
  width: "72px",
  height: `${profile.scale.chipHeight}px`,
  borderRadius: `${Math.max(6, profile.scale.cornerRadius - 2)}px`,
  background: themeMode === "light" ? "rgba(226, 232, 240, 0.82)" : "rgba(255, 255, 255, 0.10)",
});

const recommendationSummaryStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
};

const recommendationBadgeStyle = (themeMode: DesktopThemeMode, accent: DesktopAccentColor): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  height: "16px",
  padding: "1px 0",
  color: desktopTheme.brand(accent, themeMode),
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1,
  whiteSpace: "nowrap",
});

const recommendationDescriptionStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  margin: 0,
  color: desktopTheme.textPrimary(themeMode),
  fontSize: "12px",
  lineHeight: 1.35,
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const dividerStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  borderTop: `1px dashed ${themeMode === "light" ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.14)"}`,
});

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const sectionLabelStyle = (themeMode: DesktopThemeMode, profile: GroupCardDisplayProfile): CSSProperties => ({
  margin: 0,
  fontSize: `${profile.scale.sectionLabelSize}px`,
  fontWeight: 600,
  color: desktopTheme.textPrimary(themeMode),
  textTransform: "uppercase",
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

const tagHoverAddButtonStyle = (
  themeMode: DesktopThemeMode,
  accent: DesktopAccentColor,
  isVisible: boolean,
): CSSProperties => ({
  width: isVisible ? "24px" : 0,
  height: "24px",
  padding: 0,
  border: `0.5px solid ${desktopTheme.brand(accent, themeMode)}55`,
  borderRadius: "8px",
  background: `${desktopTheme.brand(accent, themeMode)}20`,
  display: "grid",
  placeItems: "center",
  opacity: isVisible ? 1 : 0,
  overflow: "hidden",
  cursor: isVisible ? "pointer" : "default",
  pointerEvents: isVisible ? "auto" : "none",
});

const tagHoverAddIconStyle: CSSProperties = {
  width: "9px",
  height: "9px",
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

const tagInputDividerStyle = (themeMode: DesktopThemeMode): CSSProperties => ({
  width: "1px",
  height: "24px",
  borderLeft: `1px dashed ${desktopTheme.cardBorder(themeMode)}`,
});

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

const infoChipStyle = (
  themeMode: DesktopThemeMode,
  profile: GroupCardDisplayProfile,
  accent?: DesktopAccentColor,
): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: `${profile.scale.chipHeight}px`,
  padding: "0 12px",
  borderRadius: `${Math.max(6, profile.scale.cornerRadius - 2)}px`,
  background: accent ? `${desktopTheme.brand(accent, themeMode)}20` : themeMode === "light" ? "rgba(241, 245, 249, 0.95)" : "rgba(255, 255, 255, 0.08)",
  border: `1px solid ${accent ? `${desktopTheme.brand(accent, themeMode)}55` : themeMode === "light" ? "rgba(203, 213, 225, 0.9)" : "rgba(255, 255, 255, 0.12)"}`,
  color: accent ? desktopTheme.brand(accent, themeMode) : desktopTheme.textPrimary(themeMode),
  fontSize: `${profile.scale.chipFontSize}px`,
  fontWeight: 600,
});

const toggleChipStyle = (
  themeMode: DesktopThemeMode,
  accent: DesktopAccentColor,
  profile: GroupCardDisplayProfile,
  selected: boolean,
  partial: boolean,
): CSSProperties => ({
  ...infoChipStyle(themeMode, profile, selected || partial ? accent : undefined),
  border: "none",
  cursor: "pointer",
  opacity: selected ? 1 : partial ? 0.88 : 0.58,
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

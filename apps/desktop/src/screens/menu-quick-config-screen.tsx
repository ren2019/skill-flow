import { startTransition, useEffect, useRef, useState, type CSSProperties } from "react";
import { resolveActionIcon } from "../icons/action-icons";
import { localize } from "../i18n";
import { desktopTheme } from "../theme/app-theme";
import { HomeViewModel } from "../view-models/home-view-model";
import { SharedGroupCard, type GroupCardDisplayMode } from "../components/shared-group-card";

type MenuQuickConfigScreenProps = {
  viewModel: HomeViewModel;
};

export function MenuQuickConfigScreen({ viewModel }: MenuQuickConfigScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSourceId, setExpandedSourceId] = useState<string | undefined>(undefined);
  const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const cards = viewModel.menuInventoryCards(searchQuery);
  const cardDisplayMode = menuGroupCardDisplayMode(viewModel.menuCardDensity);
  const clearHoverExpansion = () => {
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = undefined;
    }
  };
  const scheduleHoverExpansion = (sourceId: string) => {
    clearHoverExpansion();
    hoverExpandTimerRef.current = setTimeout(() => {
      setExpandedSourceId(sourceId);
      hoverExpandTimerRef.current = undefined;
    }, 500);
  };
  const cancelHoverExpansion = (sourceId: string) => {
    clearHoverExpansion();
    setExpandedSourceId((current) => current === sourceId ? undefined : current);
  };

  useEffect(() => () => clearHoverExpansion(), []);

  return (
    <main data-view="menu-quick-config" style={pageStyle(viewModel.themeMode)}>
      <section data-view="menu-quick-config-shell" style={shellStyle(viewModel.themeMode)}>
        <header data-view="menu-quick-config-top-bar" style={topBarStyle(viewModel.themeMode)}>
          <div style={searchFieldStyle(viewModel.themeMode)}>
            <img src={resolveActionIcon("search")} alt="" aria-hidden="true" style={searchIconStyle} />
            <input
              data-menu-search-input="true"
              value={searchQuery}
              placeholder={t("menu.placeholder.search_group_source")}
              onChange={(event) => {
                setSearchQuery(event.currentTarget.value);
              }}
              style={searchInputStyle(viewModel.themeMode)}
            />
          </div>
          <button
            type="button"
            data-menu-close="true"
            onClick={() => {
              viewModel.showHome();
            }}
            style={iconButtonStyle(viewModel.themeMode)}
          >
            <img src={resolveActionIcon("close")} alt="" aria-hidden="true" style={smallIconStyle} />
          </button>
        </header>

        <section data-view="menu-quick-config-list" style={listStyle}>
          {cards.length > 0 ? cards.map((card) => (
            <div
              key={card.sourceId}
              data-menu-card-shell={card.sourceId}
              onMouseEnter={() => {
                scheduleHoverExpansion(card.sourceId);
              }}
              onMouseLeave={() => {
                cancelHoverExpansion(card.sourceId);
              }}
            >
              <SharedGroupCard
                card={card}
                themeMode={viewModel.themeMode}
                themeAccent={viewModel.themeAccent}
                pinned={viewModel.isPinned(card.sourceId)}
                displayMode={cardDisplayMode}
                skillsCollapsed={expandedSourceId !== card.sourceId}
                isUpdating={viewModel.isUpdatingSource(card.sourceId)}
                onOpen={() => undefined}
                onUpdate={() => {
                  stateTransition(() => viewModel.updateSource(card.sourceId));
                }}
                onTogglePinned={() => {
                  stateTransition(() => viewModel.togglePinned(card.sourceId));
                }}
                onDelete={() => {
                  stateTransition(() => viewModel.deleteSource(card.sourceId));
                }}
                onToggleSkill={(skillId) => {
                  stateTransition(() => viewModel.toggleCardSkill(card.sourceId, skillId));
                }}
                onToggleAllSkills={() => {
                  stateTransition(() => viewModel.toggleAllCardSkills(card.sourceId));
                }}
                onToggleTarget={(targetId) => {
                  stateTransition(() => viewModel.toggleCardTarget(card.sourceId, targetId));
                }}
                onToggleAllTargets={() => {
                  stateTransition(() => viewModel.toggleAllCardTargets(card.sourceId));
                }}
                onOpenRepository={(url) => {
                  stateTransition(() => viewModel.openCardRepository(url));
                }}
                onOpenLocalPath={(path) => {
                  stateTransition(() => viewModel.openCardPath(path));
                }}
                groupTagItems={viewModel.inventoryTags(card.sourceId)}
                groupTagSuggestions={[]}
                canCreateGroupTag={false}
                canDeleteGroupTags={false}
                onCreateGroupTag={() => undefined}
                onDeleteGroupTag={() => undefined}
                onSelectGroupTag={() => undefined}
                labels={{
                  update: t("action.update"),
                  delete: t("action.delete"),
                  all: t("action.all"),
                  pin: t("action.pin"),
                  unpin: t("action.unpin"),
                  pinned: t("state.pinned"),
                  import: t("action.import"),
                  updating: t("group_card.loading.updating"),
                  agents: t("common.section.agents"),
                  skills: t("common.section.skills"),
                  tags: t("common.section.tags"),
                  addTag: t("group_tag.action.add"),
                  editTags: t("group_card.action.edit_tags"),
                  cancelEditTags: t("group_card.action.cancel_edit_tags"),
                  deleteTags: t("group_card.action.delete_tags"),
                  doneDeleteTags: t("group_card.action.done_delete_tags"),
                  tagPlaceholder: t("group_tag.input.placeholder"),
                  activeTargets: (count) => `${count} active targets`,
                  enabledSkills: (enabledCount, totalCount) => `${enabledCount} / ${totalCount} skills`,
                }}
              />
            </div>
          )) : (
            <div data-view="menu-quick-config-empty" style={emptyStyle(viewModel.themeMode)}>
              {t("page.home.empty")}
            </div>
          )}
        </section>

        <footer data-view="menu-quick-config-action-bar" style={actionBarStyle(viewModel.themeMode)}>
          <button
            type="button"
            data-menu-import="true"
            onClick={() => {
              viewModel.showImportPage();
            }}
            style={actionButtonStyle(viewModel.themeMode)}
          >
            <img src={resolveActionIcon("import")} alt="" aria-hidden="true" style={smallIconStyle} />
          </button>
          <button
            type="button"
            data-menu-settings="true"
            onClick={() => {
              viewModel.showSettings();
            }}
            style={actionButtonStyle(viewModel.themeMode)}
          >
            <img src={resolveActionIcon("settings")} alt="" aria-hidden="true" style={smallIconStyle} />
          </button>
        </footer>
      </section>
    </main>
  );
}

function menuGroupCardDisplayMode(density: string): GroupCardDisplayMode {
  return density === "comfortable" ? "menuComfortable" : "menuCompact";
}

function stateTransition(action: () => Promise<unknown> | unknown) {
  startTransition(() => {
    void action();
  });
}

const pageStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: desktopTheme.pageBackground(themeMode),
  color: desktopTheme.textPrimary(themeMode),
});

const shellStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  position: "relative",
  width: "360px",
  height: "440px",
  overflow: "hidden",
  borderRadius: "12px",
  background: desktopTheme.pageBackground(themeMode),
  boxShadow: `0 18px 40px ${desktopTheme.cardShadow(themeMode)}`,
});

const topBarStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 2,
  display: "grid",
  gridTemplateColumns: "1fr 34px",
  gap: "6px",
  padding: "6px 8px 4px",
  background: desktopTheme.pageBackground(themeMode),
});

const searchFieldStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  height: "34px",
  padding: "0 12px",
  borderRadius: "8px",
  background: themeMode === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.08)",
  boxShadow: `0 2px 8px ${desktopTheme.cardShadow(themeMode)}`,
});

const searchInputStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: desktopTheme.textPrimary(themeMode),
  fontSize: "12px",
  textTransform: "uppercase",
});

const searchIconStyle: CSSProperties = {
  width: "11px",
  height: "11px",
};

const smallIconStyle: CSSProperties = {
  width: "12px",
  height: "12px",
};

const iconButtonStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  display: "grid",
  placeItems: "center",
  height: "34px",
  border: "none",
  borderRadius: "8px",
  background: themeMode === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.08)",
  boxShadow: `0 2px 8px ${desktopTheme.cardShadow(themeMode)}`,
  cursor: "pointer",
});

const listStyle: CSSProperties = {
  height: "100%",
  overflowY: "auto",
  padding: "50px 8px 40px",
  display: "grid",
  alignContent: "start",
  gap: "8px",
};

const emptyStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  minHeight: "320px",
  display: "grid",
  placeItems: "center",
  color: desktopTheme.textMuted(themeMode),
  fontSize: "13px",
});

const actionBarStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  display: "flex",
  justifyContent: "space-between",
  height: "30px",
  padding: "4px 8px",
  background: desktopTheme.pageBackground(themeMode),
});

const actionButtonStyle = (themeMode: "light" | "dark"): CSSProperties => ({
  display: "grid",
  placeItems: "center",
  width: "28px",
  height: "22px",
  border: "none",
  background: "transparent",
  color: desktopTheme.textPrimary(themeMode),
  cursor: "pointer",
});

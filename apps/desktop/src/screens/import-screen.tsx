import { startTransition, useEffect, type CSSProperties } from "react";
import { EmptyState } from "../components/empty-state";
import { GroupCard } from "../components/group-card";
import { GroupTags } from "../components/group-tags";
import { localize, localizePhaseKind } from "../i18n";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const content = viewModel.content;

  useEffect(() => {
    startTransition(() => {
      void viewModel.loadImportPageIfNeeded();
    });
  }, [viewModel]);

  const hasDisplayedGroups = content.kind === "recommended"
    ? content.sections.some((section) => section.groups.length > 0)
    : content.groups.length > 0;

  if (content.kind === "searchResults" && !hasDisplayedGroups && viewModel.searchPhase.kind === "failed") {
    return (
      <main data-view="import-page" style={pageStyle}>
        <ImportSearchHeader
          query={viewModel.importSearchText}
          placeholderIndex={viewModel.importPlaceholderIndex}
          onQueryChange={(query) => {
            viewModel.importSearchText = query;
          }}
          onSearch={() => {
            startTransition(() => {
              void viewModel.submitSearch(viewModel.importSearchText);
            });
          }}
          title={t("page.import.title")}
          actionTitle={t("action.search")}
        />
        <section data-view="import-centered-state" style={centeredStateStyle}>
          <EmptyState
            title={t("page.import.empty_title")}
            subtitle={viewModel.failedSearchMessage ?? t("page.import.empty_search")}
          />
        </section>
      </main>
    );
  }

  return (
    <main data-view="import-page" style={pageStyle}>
      <ImportSearchHeader
        query={viewModel.importSearchText}
        placeholderIndex={viewModel.importPlaceholderIndex}
        onQueryChange={(query) => {
          viewModel.importSearchText = query;
        }}
        onSearch={() => {
          startTransition(() => {
            void viewModel.submitSearch(viewModel.importSearchText);
          });
        }}
        title={t("page.import.title")}
        actionTitle={t("action.search")}
      />
      {content.kind === "recommended" ? (
        <section data-view="recommendation-rails" style={contentColumnStyle}>
          <section style={introPanelStyle}>
            <p style={eyebrowStyle}>{t("route.importPage")}</p>
            <h2 style={sectionTitleStyle}>{t("page.import.recommended")}</h2>
          </section>
          {content.sections.map((section) => (
            <section key={section.categoryId} style={{ display: "grid", gap: "10px" }}>
              <h3 style={railTitleStyle}># {section.title}</h3>
              <div data-view="import-rail" style={railStyle}>
                {section.groups.map((group) => {
                  const draft = viewModel.draftsByItemId[group.id];
                  const selectedSkillIds = draft?.selectedSkillIds ?? group.skills.map((skill) => skill.id);
                  const enabledTargetIds = draft?.enabledTargetIds ?? [];

                  return (
                    <div key={group.id} style={railCardStyle}>
                      <GroupCard
                        title={group.id}
                        subtitle={group.recommendationDescription ?? t("page.import.draft_selection")}
                        meta={localizePhaseKind(group.previewPhase.kind, viewModel.desktopLanguage)}
                      >
                        <div style={buttonRowStyle}>
                          <button
                            type="button"
                            data-preview-group-id={group.id}
                            onClick={() => {
                              startTransition(() => {
                                void viewModel.previewImportGroupIfNeeded(group.id);
                              });
                            }}
                            style={primaryButtonStyle(false)}
                          >
                            {t("action.preview")}
                          </button>
                          <button
                            type="button"
                            data-import-group-id={group.id}
                            disabled={Boolean(group.isInstalledLocally)}
                            onClick={() => {
                              startTransition(() => {
                                void viewModel.importGroup(group.id);
                              });
                            }}
                            style={primaryButtonStyle(Boolean(group.isInstalledLocally))}
                          >
                            {group.isInstalledLocally ? t("state.installed") : t("action.import")}
                          </button>
                        </div>
                        <div style={detailStackStyle}>
                          <p style={labelStyle}>{t("page.import.skills")}</p>
                          <GroupTags tags={selectedSkillIds} />
                        </div>
                        <div style={detailStackStyle}>
                          <p style={labelStyle}>{t("page.import.targets")}</p>
                          <GroupTags tags={enabledTargetIds.length > 0 ? enabledTargetIds : group.targets.map((target) => target.id)} />
                        </div>
                      </GroupCard>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <section data-view="import-search-results" style={contentColumnStyle}>
          <section style={introPanelStyle}>
            <p style={eyebrowStyle}>{t("route.importPage")}</p>
            <h2 style={sectionTitleStyle}>{t("page.import.search_results")}</h2>
            <p style={metaTextStyle}>{viewModel.importSubmittedQuery}</p>
            <p style={metaTextStyle}>{localizePhaseKind(viewModel.searchPhase.kind, viewModel.desktopLanguage)}</p>
          </section>
          <div data-view="import-search-grid" style={searchGridStyle}>
            {content.groups.map((group) => (
              <GroupCard
                key={group.id}
                title={group.id}
                subtitle={group.locator}
                meta={localizePhaseKind(group.previewPhase.kind, viewModel.desktopLanguage)}
              >
                <div style={detailStackStyle}>
                  <p style={labelStyle}>{t("page.import.skills")}</p>
                  <GroupTags tags={group.skills.map((skill) => skill.id)} />
                </div>
                <div style={detailStackStyle}>
                  <p style={labelStyle}>{t("page.import.targets")}</p>
                  <GroupTags tags={group.targets.map((target) => target.id)} />
                </div>
              </GroupCard>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

type ImportSearchHeaderProps = {
  query: string;
  placeholderIndex: number;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  title: string;
  actionTitle: string;
};

function ImportSearchHeader({
  query,
  placeholderIndex,
  onQueryChange,
  onSearch,
  title,
  actionTitle,
}: ImportSearchHeaderProps) {
  return (
    <section style={headerStyle}>
      <div style={{ display: "grid", gap: "6px" }}>
        <p style={eyebrowStyle}>Import</p>
        <h1 style={headingStyle}>{title}</h1>
      </div>
      <form style={searchBarStyle}>
        <input
          data-placeholder-index={placeholderIndex}
          data-testid="import-search-input"
          type="text"
          value={query}
          placeholder="search packages, authors, repos"
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          style={searchInputStyle}
        />
        <button
          data-testid="import-search-submit"
          type="button"
          onClick={onSearch}
          style={primaryButtonStyle(false)}
        >
          {actionTitle}
        </button>
      </form>
    </section>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: "20px",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const contentColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const introPanelStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255, 255, 255, 0.84)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 700,
  color: "#0f172a",
};

const metaTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#475569",
};

const searchBarStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  minWidth: "320px",
  flexWrap: "wrap",
};

const searchInputStyle: CSSProperties = {
  minWidth: "280px",
  flex: 1,
  height: "40px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(255, 255, 255, 0.9)",
};

const centeredStateStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "420px",
};

const railTitleStyle: CSSProperties = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "28px",
  width: "fit-content",
  padding: "0 10px",
  borderRadius: "8px",
  background: "rgba(219, 234, 254, 0.85)",
  color: "#0c4a6e",
  fontSize: "13px",
  fontWeight: 600,
};

const railStyle: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "304px",
  gap: "14px",
  overflowX: "auto",
  paddingBottom: "4px",
};

const railCardStyle: CSSProperties = {
  width: "304px",
};

const searchGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
  alignItems: "start",
};

const detailStackStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    height: "34px",
    padding: "0 12px",
    borderRadius: "10px",
    border: disabled ? "1px solid rgba(148, 163, 184, 0.22)" : "1px solid rgba(14, 116, 144, 0.22)",
    background: disabled ? "rgba(226, 232, 240, 0.82)" : "rgba(224, 242, 254, 0.86)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

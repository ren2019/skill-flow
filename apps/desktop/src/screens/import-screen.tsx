import { startTransition, useEffect, type CSSProperties } from "react";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { EmptyState } from "../components/empty-state";
import { GroupCard } from "../components/group-card";
import { GroupTags } from "../components/group-tags";
import { localize, localizePhaseKind } from "../i18n";
import type { ImportGroupState } from "../store/import-state";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const content = viewModel.content;
  const autoPreviewIds = previewGroupIds(groupsForContent(content));
  const autoPreviewKey = autoPreviewTaskKey(autoPreviewIds, viewModel.importSubmittedQuery);

  useEffect(() => {
    startTransition(() => {
      void viewModel.loadImportPageIfNeeded();
    });
  }, [viewModel]);

  useEffect(() => {
    if (autoPreviewIds.length === 0) {
      return;
    }
    startTransition(() => {
      for (const groupId of autoPreviewIds) {
        void viewModel.previewImportGroupIfNeeded(groupId);
      }
    });
  }, [autoPreviewKey, viewModel]);

  const hasDisplayedGroups = content.kind === "recommended"
    ? content.sections.some((section) => section.groups.length > 0)
    : content.groups.length > 0;
  const topBar = (
    <DesktopTopBar
      routeKind="importPage"
      desktopLanguage={viewModel.desktopLanguage}
      themeMode={viewModel.themeMode}
      themeAccent={viewModel.themeAccent}
      title={t("page.import.title")}
      searchValue=""
      importSearch={{
        value: viewModel.importSearchText,
        placeholder: viewModel.importPlaceholderText,
        phaseKind: viewModel.searchPhase.kind,
        resultCount: content.kind === "searchResults" ? content.groups.length : 0,
        submittedQuery: viewModel.importSubmittedQuery,
        onChange: (query) => {
          viewModel.setSearchText(query);
        },
        onSubmit: () => {
          startTransition(() => {
            void viewModel.submitSearch(viewModel.importSearchText);
          });
        },
      }}
      onSearchChange={() => undefined}
      onBack={() => {
        viewModel.showHome();
      }}
      onImport={() => undefined}
      onUpdate={() => undefined}
      onSettings={() => undefined}
    />
  );

  if (content.kind === "searchResults" && !hasDisplayedGroups && viewModel.searchPhase.kind === "failed") {
    return (
      <main data-view="import-page" style={pageStyle}>
        {topBar}
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
      {topBar}
      {content.kind === "recommended" ? (
        <section data-view="recommendation-rails" style={contentColumnStyle}>
          <section style={introPanelStyle}>
            <h2 style={sectionTitleStyle}>{t("page.import.recommended")}</h2>
          </section>
          {content.sections.map((section) => (
            <section key={section.categoryId} style={{ display: "grid", gap: "10px" }}>
              <h3 style={railTitleStyle}># {section.title}</h3>
              <div data-view="import-rail" style={railStyle}>
                {section.groups.map((group) => {
                  return (
                    <div key={group.id} style={railCardStyle}>
                      {renderImportGroupCard(group, viewModel, t)}
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
            <h2 style={sectionTitleStyle}>{t("page.import.search_results")}</h2>
            <p style={metaTextStyle}>{viewModel.importSubmittedQuery}</p>
            <p style={metaTextStyle}>{localizePhaseKind(viewModel.searchPhase.kind, viewModel.desktopLanguage)}</p>
          </section>
          <div data-view="import-search-grid" style={searchGridStyle}>
            {content.groups.map((group) => (
              <div key={group.id}>
                {renderImportGroupCard(group, viewModel, t)}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

type ImportContent =
  | { kind: "recommended"; sections: Array<{ groups: ImportGroupState[] }> }
  | { kind: "searchResults"; groups: ImportGroupState[] };

export function previewGroupIds(groups: ImportGroupState[]): string[] {
  return groups
    .filter((group) => group.previewPhase.kind === "idle")
    .map((group) => group.id);
}

export function autoPreviewTaskKey(groupIds: string[], submittedQuery: string): string {
  return [submittedQuery, ...groupIds].join("|");
}

function groupsForContent(content: ImportContent): ImportGroupState[] {
  return content.kind === "recommended"
    ? content.sections.flatMap((section) => section.groups)
    : content.groups;
}

function renderImportGroupCard(
  group: ImportGroupState,
  viewModel: ImportViewModel,
  t: (key: string) => string,
) {
  const draft = viewModel.draftsByItemId[group.id];
  const selectedSkillIds = draft?.selectedSkillIds ?? group.skills.map((skill) => skill.id);
  const enabledTargetIds = draft?.enabledTargetIds ?? [];
  const visibleTargetIds = enabledTargetIds.length > 0
    ? enabledTargetIds
    : group.targets.map((target) => target.id);

  return (
    <GroupCard
      title={group.id}
      subtitle={group.recommendationDescription ?? group.locator}
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
        <GroupTags tags={visibleTargetIds} />
      </div>
    </GroupCard>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: 0,
  background: "#f2f2f2",
};

const contentColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: "0 20px 20px",
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

const centeredStateStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "420px",
  padding: "0 20px 20px",
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

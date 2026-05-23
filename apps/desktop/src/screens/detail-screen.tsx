import { startTransition, useState, type CSSProperties } from "react";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { DetailHeader } from "../components/detail-header";
import { DetailSidebar } from "../components/detail-sidebar";
import { GroupTagSection } from "../components/shared-group-card";
import { localize } from "../i18n";
import { MarkdownDocument } from "../components/markdown-document";
import type { DetailFileTreeItem } from "../store/detail-state";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailScreenProps = {
  viewModel: DetailViewModel;
};

export function DetailScreen({ viewModel }: DetailScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const sourceId = viewModel.sourceId;
  const detail = viewModel.detail;
  const [isEditingTags, setIsEditingTags] = useState(false);

  if (!sourceId) {
    return (
      <main style={pageStyle}>
        <DetailTopBar viewModel={viewModel} title={t("page.detail.title")} />
        <section style={emptyStateStyle}>
          <p>{t("page.detail.empty")}</p>
        </section>
      </main>
    );
  }

  if (!detail) {
    return (
      <main style={pageStyle}>
        <DetailTopBar viewModel={viewModel} title={t("page.detail.title")} />
        <section style={emptyStateStyle}>
          <p>{t("page.detail.loading")}</p>
        </section>
      </main>
    );
  }

  const document = viewModel.showingGroupOverview
    ? viewModel.selectedGroupDocument
    : viewModel.selectedSkillDocument;
  const activeDocuments = viewModel.showingGroupOverview
    ? detail.groupDocuments
    : (detail.skills.find((skill) => skill.id === viewModel.selectedSkillId)?.documents ?? []);
  const documentSource = document?.content || t("page.detail.no_content");

  return (
    <main style={pageStyle}>
      <DetailTopBar viewModel={viewModel} title={detail.title || t("page.detail.title")} />
      {viewModel.toastMessage ? (
        <div role="status" style={toastStyle}>
          {viewModel.toastMessage}
        </div>
      ) : null}
      <div data-view="detail-layout" style={layoutStyle}>
        <DetailSidebar viewModel={viewModel} />
        <section style={mainShellStyle}>
          <DetailHeader viewModel={viewModel} />
          <div data-view="detail-body" style={bodyStyle}>
            <aside data-view="detail-tree-panel" style={treePanelStyle}>
              <h2 style={sectionLabelStyle}>Files</h2>
              <FileTree items={detail.fileTree} viewModel={viewModel} />
            </aside>
            <section style={contentColumnStyle}>
              <section data-view="detail-fact-rail" style={factRailStyle}>
                <div style={factCardStyle}>
                  <h3 style={sectionLabelStyle}>Source Facts</h3>
                  <ul style={factListStyle}>
                    {detail.sourceFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
                <div style={factCardStyle}>
                  <h3 style={sectionLabelStyle}>Deployment Facts</h3>
                  <ul style={factListStyle}>
                    {detail.deploymentFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section style={selectionRailStyle}>
                <section data-view="detail-tag-rail" style={detailTagRailStyle}>
                  <h3 style={sectionLabelStyle}>{t("common.section.tags")}</h3>
                  <GroupTagSection
                    sourceId={sourceId}
                    items={viewModel.groupTagItems(sourceId)}
                    suggestions={viewModel.groupTagSuggestions(sourceId)}
                    canCreate={viewModel.canCreateGroupTag(sourceId) && isEditingTags}
                    canStartEditing={viewModel.canCreateGroupTag(sourceId) && !isEditingTags}
                    canDelete={viewModel.canDeleteGroupTags(sourceId)}
                    themeMode={viewModel.themeMode}
                    themeAccent={viewModel.themeAccent}
                    addLabel={t("group_tag.action.add")}
                    placeholder={t("group_tag.input.placeholder")}
                    onStartEditing={() => {
                      setIsEditingTags(true);
                    }}
                    onCreate={(title, accent) => {
                      viewModel.addCustomTag(sourceId, title, accent);
                      setIsEditingTags(false);
                    }}
                    onDelete={(tagId) => {
                      viewModel.removeCustomTag(sourceId, tagId);
                    }}
                    onSelect={() => undefined}
                  />
                </section>
                <nav style={toggleRailStyle}>
                  {detail.targets.map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      data-target-toggle-id={target.id}
                      onClick={() => {
                        startTransition(() => {
                          void viewModel.toggleTarget(target.id);
                        });
                      }}
                      style={chipButtonStyle(Boolean(target.isEnabled))}
                    >
                      {target.label ?? target.id}
                    </button>
                  ))}
                </nav>
                <nav style={toggleRailStyle}>
                  {detail.skills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      data-skill-toggle-id={skill.id}
                      onClick={() => {
                        startTransition(() => {
                          void viewModel.toggleSkill(skill.id);
                        });
                      }}
                      style={chipButtonStyle(skill.isEnabled)}
                    >
                      {skill.title}: {skill.isEnabled ? t("action.disable") : t("action.enable")}
                    </button>
                  ))}
                </nav>
              </section>

              <nav data-view="detail-document-tabs" style={documentTabsStyle}>
                {activeDocuments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-group-document-id={viewModel.showingGroupOverview ? item.id : undefined}
                    data-skill-document-id={viewModel.showingGroupOverview ? undefined : item.id}
                    onClick={() => {
                      if (viewModel.showingGroupOverview) {
                        viewModel.selectGroupDocument(item.id);
                        return;
                      }
                      if (viewModel.selectedSkillId) {
                        viewModel.selectSkillDocument(viewModel.selectedSkillId, item.id);
                      }
                    }}
                    style={documentTabStyle(document?.id === item.id)}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>

              <MarkdownDocument title={document?.title ?? "README"} source={documentSource} />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function DetailTopBar({ viewModel, title }: { viewModel: DetailViewModel; title: string }) {
  return (
    <DesktopTopBar
      routeKind="detail"
      desktopLanguage={viewModel.desktopLanguage}
      themeMode={viewModel.themeMode}
      themeAccent={viewModel.themeAccent}
      title={title}
      searchValue=""
      onSearchChange={() => undefined}
      onBack={() => {
        viewModel.showHome();
      }}
      onImport={() => undefined}
      onUpdate={() => undefined}
      onSettings={() => undefined}
    />
  );
}

function FileTree({
  items,
  viewModel,
  depth = 0,
}: {
  items: DetailFileTreeItem[];
  viewModel: DetailViewModel;
  depth?: number;
}) {
  return (
    <ul style={treeListStyle}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            data-tree-item-id={item.id}
            onClick={() => {
              viewModel.selectTreeItem(item.id);
            }}
            style={treeButtonStyle(viewModel.selectedTreeItemId === item.id, depth)}
          >
            {item.title}
          </button>
          {item.children.length > 0 ? (
            <FileTree items={item.children} viewModel={viewModel} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 0,
  background: "#f2f2f2",
};

const toastStyle: CSSProperties = {
  margin: "14px 20px 0",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(14, 116, 144, 0.18)",
  background: "rgba(240, 249, 255, 0.96)",
};

const emptyStateStyle: CSSProperties = {
  padding: "20px",
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  gap: "14px",
  alignItems: "start",
  padding: "20px",
};

const mainShellStyle: CSSProperties = {
  display: "grid",
  borderRadius: "20px",
  overflow: "hidden",
  background: "rgba(255, 255, 255, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

const bodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  gap: "16px",
  padding: "18px",
};

const treePanelStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: "10px",
  padding: "14px",
  borderRadius: "18px",
  background: "rgba(248, 250, 252, 0.92)",
};

const treeListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "8px",
};

const contentColumnStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const factRailStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const factCardStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  padding: "14px",
  borderRadius: "18px",
  background: "rgba(248, 250, 252, 0.92)",
};

const factListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  display: "grid",
  gap: "6px",
  color: "#334155",
  fontSize: "12px",
};

const selectionRailStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const detailTagRailStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const toggleRailStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const documentTabsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const sectionLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

function treeButtonStyle(active: boolean, depth = 0): CSSProperties {
  return {
    width: "100%",
    minHeight: "38px",
    padding: `0 12px 0 ${12 + depth * 14}px`,
    borderRadius: "10px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(224, 242, 254, 0.88)" : "rgba(255, 255, 255, 0.92)",
    color: "#0f172a",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
  };
}

function chipButtonStyle(active: boolean): CSSProperties {
  return {
    minHeight: "34px",
    padding: "0 12px",
    borderRadius: "999px",
    border: active ? "1px solid rgba(13, 148, 136, 0.26)" : "1px solid rgba(148, 163, 184, 0.2)",
    background: active ? "rgba(204, 251, 241, 0.9)" : "rgba(255, 255, 255, 0.88)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

function documentTabStyle(active: boolean): CSSProperties {
  return {
    minHeight: "34px",
    padding: "0 12px",
    borderRadius: "10px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(224, 242, 254, 0.88)" : "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

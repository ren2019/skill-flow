import { startTransition, useState, type CSSProperties, type ReactNode } from "react";
import { AgentIcon } from "../components/agent-icon";
import { DesktopTopBar } from "../components/desktop-top-bar";
import { DetailHeader } from "../components/detail-header";
import { DetailSidebar } from "../components/detail-sidebar";
import { GroupTagSection } from "../components/shared-group-card";
import { localize } from "../i18n";
import { MarkdownDocument } from "../components/markdown-document";
import { resolveActionIcon } from "../icons/action-icons";
import type { DetailDocumentTab, DetailFileTreeItem } from "../store/detail-state";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailScreenProps = {
  viewModel: DetailViewModel;
};

export function DetailScreen({ viewModel }: DetailScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const sourceId = viewModel.sourceId;
  const detail = viewModel.presentedDetail;
  const isDetailLoading = viewModel.isDetailLoading;
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
  const selectedSkill = detail.skills.find((skill) => skill.id === viewModel.selectedSkillId);
  const documentSource = document?.content || t("page.detail.no_content");
  const shouldShowFileTree =
    viewModel.showingGroupOverview
    && (!document || isFileTreeDocument(document, t));
  const shouldShowDocumentLoading =
    Boolean(document && !document.isLoaded)
    && !(viewModel.showingGroupOverview && document && isFileTreeDocument(document, t));

  return (
    <main style={pageStyle}>
      <DetailTopBar viewModel={viewModel} title={t("page.detail.title")} />
      {viewModel.toastMessage ? (
        <div role="status" style={toastStyle}>
          {viewModel.toastMessage}
        </div>
      ) : null}
      <div data-view="detail-layout" data-detail-loading={isDetailLoading ? "true" : "false"} style={layoutStyle}>
        <DetailSidebar viewModel={viewModel} />
        <section style={mainShellStyle}>
          <DetailHeader viewModel={viewModel} />
          <div data-view="detail-body" style={bodyStyle}>
            {viewModel.showingGroupOverview ? (
              <>
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

                <section data-view="detail-agent-rail" style={railSectionStyle}>
                  <h3 style={sectionLabelStyle}>{t("common.section.agents")}</h3>
                  <nav style={toggleRailStyle}>
                    <button
                      type="button"
                      data-target-toggle-all="true"
                      onClick={() => {
                        startTransition(() => {
                          void viewModel.toggleAllTargets();
                        });
                      }}
                      style={selectionChipStyle(detail.targetSelection)}
                    >
                      {selectionLabel(detail.targetSelection, t)}
                    </button>
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
                        <span style={agentChipContentStyle}>
                          <AgentIcon
                            targetId={target.id}
                            shortLabel={target.shortLabel}
                            title={target.label ?? target.id}
                            size={20}
                            imageSize={18}
                            borderRadius="4px"
                            background="transparent"
                          />
                          <span>{target.label ?? target.id}</span>
                        </span>
                      </button>
                    ))}
                  </nav>
                </section>

                <DetailDocumentsSection
                  activeDocuments={activeDocuments}
                  selectedDocumentId={document?.id}
                  emptyTitle={t("detail.document.file_tree")}
                  sectionTitle={t("detail.section.documents")}
                  onSelectDocument={(documentId) => viewModel.selectGroupDocument(documentId)}
                  onOpenExternalDocument={(url) => viewModel.openDocumentUrl(url)}
                  renderContent={() => (
                    isDetailLoading || viewModel.isGroupDocumentLoading || shouldShowDocumentLoading ? (
                      <DetailDocumentLoadingPlaceholder label={t("detail.loading.document")} />
                    ) : shouldShowFileTree ? (
                      <FileTreeCard items={detail.fileTree} viewModel={viewModel} />
                    ) : (
                      <DetailDocumentContent document={document} source={documentSource} viewModel={viewModel} />
                    )
                  )}
                  loadingTabs={isDetailLoading}
                />
              </>
            ) : (
              !selectedSkill && !isDetailLoading ? (
                <DetailEmptyState
                  title={t("detail.empty.no_skill_title")}
                  subtitle={t("detail.empty.no_skill.subtitle")}
                />
              ) : (
                <DetailDocumentsSection
                  activeDocuments={activeDocuments}
                  selectedDocumentId={document?.id}
                  emptyTitle={document?.title ?? "README"}
                  sectionTitle={t("detail.section.documents")}
                  onSelectDocument={(documentId) => {
                    if (viewModel.selectedSkillId) {
                      viewModel.selectSkillDocument(viewModel.selectedSkillId, documentId);
                    }
                  }}
                  onOpenExternalDocument={(url) => viewModel.openDocumentUrl(url)}
                  renderContent={() => (
                    isDetailLoading || viewModel.isSkillContentLoading || viewModel.isSkillDocumentLoading || shouldShowDocumentLoading ? (
                      <DetailDocumentLoadingPlaceholder label={t("detail.loading.document")} />
                    ) : document ? (
                      <DetailDocumentContent document={document} source={documentSource} viewModel={viewModel} />
                    ) : (
                      <PlainDocument source={selectedSkill?.documentContent || t("page.detail.no_content")} />
                    )
                  )}
                  skillMode
                  showSectionTitle={false}
                  showEmptyTab={false}
                  loadingTabs={isDetailLoading}
                />
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function DetailDocumentsSection({
  activeDocuments,
  selectedDocumentId,
  emptyTitle,
  sectionTitle,
  onSelectDocument,
  onOpenExternalDocument,
  renderContent,
  skillMode = false,
  showSectionTitle = true,
  showEmptyTab = true,
  loadingTabs = false,
}: {
  activeDocuments: Array<Pick<DetailDocumentTab, "id" | "title" | "externalUrl">>;
  selectedDocumentId: string | undefined;
  emptyTitle: string;
  sectionTitle: string;
  onSelectDocument: (documentId: string) => void;
  onOpenExternalDocument: (url: string) => void | Promise<void>;
  renderContent: () => ReactNode;
  skillMode?: boolean;
  showSectionTitle?: boolean;
  showEmptyTab?: boolean;
  loadingTabs?: boolean;
}) {
  return (
    <section data-view={skillMode ? "detail-skill-documents" : "detail-group-documents"} style={documentsSectionStyle}>
      {showSectionTitle ? (
        <h3 data-view="detail-document-section-title" style={sectionLabelStyle}>{sectionTitle}</h3>
      ) : null}
      <nav data-view="detail-document-tabs" style={documentTabsStyle}>
        {loadingTabs ? (
          <DocumentTabPlaceholders widths={skillMode ? skillDocumentTabPlaceholderWidths : groupDocumentTabPlaceholderWidths} />
        ) : activeDocuments.length > 0 ? (
          activeDocuments.map((item) => (
            <span key={item.id} style={documentTabShellStyle}>
              <button
                type="button"
                data-group-document-id={skillMode ? undefined : item.id}
                data-skill-document-id={skillMode ? item.id : undefined}
                onClick={() => {
                  onSelectDocument(item.id);
                }}
                style={documentTabStyle(selectedDocumentId === item.id, Boolean(item.externalUrl))}
              >
                {item.title}
              </button>
              {item.externalUrl ? (
                <button
                  type="button"
                  data-document-external-url={item.externalUrl}
                  aria-label={item.externalUrl}
                  title={item.externalUrl}
                  onClick={() => {
                    startTransition(() => {
                      void onOpenExternalDocument(item.externalUrl ?? "");
                    });
                  }}
                  style={documentTabExternalButtonStyle}
                >
                  <img src={resolveActionIcon("external-link")} alt="" aria-hidden="true" style={documentTabExternalIconStyle} />
                </button>
              ) : null}
            </span>
          ))
        ) : showEmptyTab ? (
          <span style={emptyDocumentTabStyle}>{emptyTitle}</span>
        ) : null}
      </nav>
      {renderContent()}
    </section>
  );
}

function DocumentTabPlaceholders({ widths }: { widths: number[] }) {
  return (
    <>
      {widths.map((width, index) => (
        <span
          key={`${width}:${index}`}
          data-view="detail-document-tab-loading"
          aria-hidden="true"
          style={documentTabPlaceholderStyle(width)}
        />
      ))}
    </>
  );
}

function DetailDocumentContent({
  document,
  source,
  viewModel,
}: {
  document: DetailDocumentTab | undefined;
  source: string;
  viewModel: DetailViewModel;
}) {
  if (document && !isMarkdownDocument(document)) {
    return <PlainDocument source={source} />;
  }

  return (
    <MarkdownDocument
      path={document?.path}
      source={source}
      metadata={document?.metadata ?? []}
      onOpenUrl={(url) => viewModel.openDocumentUrl(url)}
      onOpenPath={(path) => viewModel.openDocumentPath(path)}
    />
  );
}

function PlainDocument({ source }: { source: string }) {
  return (
    <article data-view="plain-document" data-testid="plain-document" style={plainDocumentStyle}>
      <pre style={plainDocumentTextStyle}>{source}</pre>
    </article>
  );
}

function DetailEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section data-view="detail-empty-state" style={detailEmptyStateStyle}>
      <h3 style={detailEmptyTitleStyle}>{title}</h3>
      <p style={detailEmptySubtitleStyle}>{subtitle}</p>
    </section>
  );
}

function DetailDocumentLoadingPlaceholder({ label }: { label: string }) {
  return (
    <article data-view="detail-document-loading" style={plainDocumentStyle}>
      <div style={documentLoadingStyle}>
        <span aria-hidden="true" style={documentLoadingSpinnerStyle} />
        <span>{label}</span>
      </div>
    </article>
  );
}

function isMarkdownDocument(document: { path: string }): boolean {
  return document.path.toLowerCase().endsWith(".md");
}

function isFileTreeDocument(document: { id: string; title: string; path: string }, t: (key: string) => string): boolean {
  return document.id.endsWith(":filetree")
    || document.title === t("detail.document.file_tree")
    || document.path === ".";
}

function FileTreeCard({
  items,
  viewModel,
}: {
  items: DetailFileTreeItem[];
  viewModel: DetailViewModel;
}) {
  return (
    <article data-view="detail-file-tree-card" style={fileTreeCardStyle}>
      <FileTree items={items} viewModel={viewModel} />
    </article>
  );
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
  ancestryHasTrailingSiblings = [],
}: {
  items: DetailFileTreeItem[];
  viewModel: DetailViewModel;
  depth?: number;
  ancestryHasTrailingSiblings?: boolean[];
}) {
  return (
    <ul style={treeListStyle}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = viewModel.selectedTreeItemId === item.id;
        const showsSkillLink = item.isSkillRoot || item.isSkillDocument;
        return (
          <li key={item.id}>
            <button
              type="button"
              data-tree-item-id={item.id}
              data-tree-row-depth={depth}
              onClick={() => {
                viewModel.selectTreeItem(item.id);
              }}
              style={treeButtonStyle(isActive)}
            >
              {ancestryHasTrailingSiblings.map((hasTrailingSibling, guideIndex) => (
                <TreeGuideColumn
                  key={`${item.id}:guide:${guideIndex}`}
                  visible={hasTrailingSibling}
                />
              ))}
              <TreeNodeLead depth={depth} isLast={isLast} />
              <span style={treeRowContentStyle(isActive)}>
                <span
                  data-tree-selected-indicator="true"
                  data-tree-selected={isActive ? "true" : "false"}
                  style={treeSelectedIndicatorStyle(isActive)}
                />
                <TreeNodeIcon kind={item.isDirectory ? "folder" : "document"} highlighted={item.isSkillRoot} />
                <span
                  data-tree-row-title="true"
                  style={treeRowTitleStyle(isActive, showsSkillLink)}
                >
                  {item.title}
                </span>
              </span>
            </button>
            {item.children.length > 0 && viewModel.isTreeItemExpanded(item.id) ? (
              <FileTree
                items={item.children}
                viewModel={viewModel}
                depth={depth + 1}
                ancestryHasTrailingSiblings={[...ancestryHasTrailingSiblings, !isLast]}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TreeGuideColumn({ visible }: { visible: boolean }) {
  return (
    <span
      data-tree-guide-column="true"
      data-visible={visible ? "true" : "false"}
      style={treeGuideColumnStyle}
    >
      {visible ? <span style={treeGuideLineStyle} /> : null}
    </span>
  );
}

function TreeNodeLead({ depth, isLast }: { depth: number; isLast: boolean }) {
  return (
    <span
      data-tree-node-lead="true"
      data-tree-node-last={isLast ? "true" : "false"}
      style={treeNodeLeadStyle(depth)}
    >
      {depth > 0 ? <span style={treeNodeLeadHorizontalStyle} /> : null}
      {depth > 0 && !isLast ? <span style={treeNodeLeadVerticalStyle} /> : null}
    </span>
  );
}

function TreeNodeIcon({
  kind,
  highlighted,
}: {
  kind: "folder" | "document";
  highlighted: boolean;
}) {
  if (kind === "folder") {
    return (
      <span data-tree-node-icon="folder" style={treeNodeIconStyle("folder", highlighted)}>
        <span style={treeFolderTabStyle(highlighted)} />
        <span style={treeFolderBodyStyle(highlighted)} />
      </span>
    );
  }

  return (
    <span data-tree-node-icon="document" style={treeNodeIconStyle("document", highlighted)}>
      <span style={treeDocumentBodyStyle} />
      <span style={treeDocumentFoldStyle} />
    </span>
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
  borderRadius: "10px",
  overflow: "hidden",
  background: "rgba(255, 255, 255, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

const bodyStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
};

const fileTreeCardStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: "10px",
  padding: "14px",
  borderRadius: "10px",
  background: "rgba(248, 250, 252, 0.92)",
};

const treeListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "2px",
};

const railSectionStyle: CSSProperties = {
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

const groupDocumentTabPlaceholderWidths = [86, 98, 82];
const skillDocumentTabPlaceholderWidths = [92, 84, 106];

const agentChipContentStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const documentTabShellStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

const sectionLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

const documentsSectionStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const emptyDocumentTabStyle: CSSProperties = {
  minHeight: "34px",
  display: "inline-flex",
  alignItems: "center",
  padding: "0 12px",
  borderRadius: "8px",
  background: "rgba(248, 250, 252, 0.92)",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 600,
};

function documentTabPlaceholderStyle(width: number): CSSProperties {
  return {
    width: `${width}px`,
    height: "34px",
    borderRadius: "8px",
    background: "rgba(248, 250, 252, 0.92)",
  };
}

const treeGuideColumnStyle: CSSProperties = {
  position: "relative",
  flex: "0 0 16px",
  width: "16px",
  height: "28px",
};

const treeGuideLineStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "8px",
  width: "1px",
  background: "rgba(100, 116, 139, 0.28)",
};

function treeNodeLeadStyle(depth: number): CSSProperties {
  return {
    position: "relative",
    flex: `0 0 ${depth === 0 ? 6 : 22}px`,
    width: depth === 0 ? "6px" : "22px",
    height: "28px",
  };
}

const treeNodeLeadHorizontalStyle: CSSProperties = {
  position: "absolute",
  top: "14px",
  left: 0,
  width: "14px",
  height: "1px",
  background: "rgba(100, 116, 139, 0.28)",
};

const treeNodeLeadVerticalStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: "14px",
  left: 0,
  width: "1px",
  background: "rgba(100, 116, 139, 0.28)",
};

function treeButtonStyle(active: boolean): CSSProperties {
  return {
    width: "100%",
    minHeight: "28px",
    padding: 0,
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "#0f172a",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: active ? 650 : 500,
    cursor: "pointer",
  };
}

function treeRowContentStyle(active: boolean): CSSProperties {
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
    height: "28px",
    flex: "0 1 auto",
    maxWidth: "100%",
    padding: "0 8px 0 10px",
    borderRadius: "8px",
    background: active ? "rgba(14, 116, 144, 0.16)" : "transparent",
  };
}

function treeSelectedIndicatorStyle(active: boolean): CSSProperties {
  return {
    position: "absolute",
    left: "4px",
    top: "6px",
    width: "2px",
    height: "16px",
    borderRadius: "999px",
    background: "#0e7490",
    opacity: active ? 1 : 0,
  };
}

function treeNodeIconStyle(kind: "folder" | "document", highlighted: boolean): CSSProperties {
  return {
    position: "relative",
    flex: "0 0 14px",
    width: "14px",
    height: kind === "folder" ? "12px" : "14px",
    color: highlighted ? "#0e7490" : "#64748b",
  };
}

function treeFolderTabStyle(highlighted: boolean): CSSProperties {
  return {
    position: "absolute",
    left: "1px",
    top: "1px",
    width: "6px",
    height: "3px",
    borderRadius: "2px 2px 0 0",
    background: highlighted ? "#0e7490" : "#64748b",
    opacity: highlighted ? 0.9 : 0.74,
  };
}

function treeFolderBodyStyle(highlighted: boolean): CSSProperties {
  return {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "9px",
    borderRadius: "2px",
    background: highlighted ? "#0e7490" : "#64748b",
    opacity: highlighted ? 0.9 : 0.74,
  };
}

const treeDocumentBodyStyle: CSSProperties = {
  position: "absolute",
  left: "2px",
  top: "1px",
  width: "10px",
  height: "12px",
  borderRadius: "2px",
  background: "#64748b",
  opacity: 0.74,
};

const treeDocumentFoldStyle: CSSProperties = {
  position: "absolute",
  right: "2px",
  top: "1px",
  width: 0,
  height: 0,
  borderLeft: "4px solid rgba(248, 250, 252, 0.92)",
  borderBottom: "4px solid transparent",
};

function treeRowTitleStyle(active: boolean, showsSkillLink: boolean): CSSProperties {
  return {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: active ? "#0e7490" : "#0f172a",
    fontSize: "11px",
    fontWeight: showsSkillLink ? 650 : 400,
    lineHeight: 1.2,
  };
}

function chipButtonStyle(active: boolean): CSSProperties {
  return {
    minHeight: "34px",
    padding: "0 12px",
    borderRadius: "10px",
    border: active ? "1px solid rgba(13, 148, 136, 0.26)" : "1px solid rgba(148, 163, 184, 0.2)",
    background: active ? "rgba(204, 251, 241, 0.9)" : "rgba(255, 255, 255, 0.88)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

function selectionChipStyle(selection: "empty" | "partial" | "full"): CSSProperties {
  return {
    ...chipButtonStyle(selection === "full"),
    width: "40px",
    padding: 0,
    justifyContent: "center",
    background:
      selection === "partial"
        ? "rgba(254, 249, 195, 0.92)"
        : chipButtonStyle(selection === "full").background,
  };
}

function documentTabStyle(active: boolean, hasExternalUrl = false): CSSProperties {
  return {
    minHeight: "34px",
    padding: hasExternalUrl ? "0 30px 0 12px" : "0 12px",
    borderRadius: "8px",
    border: active ? "1px solid rgba(14, 116, 144, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(224, 242, 254, 0.88)" : "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}

const documentTabExternalButtonStyle: CSSProperties = {
  position: "absolute",
  right: "8px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  height: "16px",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const documentTabExternalIconStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  opacity: 0.62,
};

const plainDocumentStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "10px",
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const plainDocumentTextStyle: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  color: "#0f172a",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  lineHeight: 1.55,
};

const detailEmptyStateStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: "6px",
  minHeight: "200px",
  padding: "18px",
  borderRadius: "10px",
  background: "rgba(255, 255, 255, 0.92)",
};

const detailEmptyTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 650,
};

const detailEmptySubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 400,
};

const documentLoadingStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "42px",
  color: "#64748b",
  fontSize: "12px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const documentLoadingSpinnerStyle: CSSProperties = {
  width: "13px",
  height: "13px",
  borderRadius: "999px",
  border: "2px solid rgba(100, 116, 139, 0.24)",
  borderTopColor: "#64748b",
};

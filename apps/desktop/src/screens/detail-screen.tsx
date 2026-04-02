import { startTransition } from "react";
import { GroupCard } from "../components/group-card";
import { MarkdownDocument } from "../components/markdown-document";
import { DetailViewModel } from "../view-models/detail-view-model";

type DetailScreenProps = {
  viewModel: DetailViewModel;
};

export function DetailScreen({ viewModel }: DetailScreenProps) {
  const sourceId = viewModel.sourceId;
  const detail = viewModel.detail;

  if (!sourceId) {
    return (
      <main>
        <h1>Source Detail</h1>
        <p>No source selected</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main>
        <h1>Source Detail</h1>
        <p>Loading source detail</p>
      </main>
    );
  }

  const document = viewModel.showingGroupOverview
    ? viewModel.selectedGroupDocument
    : viewModel.selectedSkillDocument;
  const documentSource = document?.content || "No detail content loaded yet.";

  return (
    <main>
      <h1>Source Detail</h1>
      <GroupCard title={detail.title} subtitle={`Current route: ${viewModel.currentRoute.kind}`}>
        <p>{detail.enabledTargetLabels.join(", ")}</p>
        <ul>
          {detail.fileTree.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                data-tree-item-id={item.id}
                onClick={() => {
                  viewModel.selectTreeItem(item.id);
                }}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
        <ul>
          {detail.groupDocuments.map((groupDocument) => (
            <li key={groupDocument.id}>{groupDocument.title}</li>
          ))}
        </ul>
        <nav>
          <button
            type="button"
            onClick={() => {
              viewModel.showOverview();
            }}
          >
            Overview
          </button>
          {detail.skills.map((skill) => (
            <span key={skill.id}>
              <button
                type="button"
                data-skill-id={skill.id}
                onClick={() => {
                  viewModel.selectSkill(skill.id);
                }}
              >
                {skill.title}
              </button>
              <button
                type="button"
                data-skill-toggle-id={skill.id}
                onClick={() => {
                  startTransition(() => {
                    void viewModel.toggleSkill(skill.id);
                  });
                }}
              >
                {skill.isEnabled ? "Disable" : "Enable"}
              </button>
            </span>
          ))}
        </nav>
        <nav>
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
            >
              {target.label ?? target.id}
            </button>
          ))}
        </nav>
        {viewModel.showingGroupOverview ? (
          <nav>
            {detail.groupDocuments.map((groupDocument) => (
              <button
                key={groupDocument.id}
                type="button"
                data-group-document-id={groupDocument.id}
                onClick={() => {
                  viewModel.selectGroupDocument(groupDocument.id);
                }}
              >
                {groupDocument.title}
              </button>
            ))}
          </nav>
        ) : (
          <nav>
            {(detail.skills.find((skill) => skill.id === viewModel.selectedSkillId)?.documents ?? []).map(
              (document) => (
                <button
                  key={document.id}
                  type="button"
                  data-skill-document-id={document.id}
                  onClick={() => {
                    if (viewModel.selectedSkillId) {
                      viewModel.selectSkillDocument(viewModel.selectedSkillId, document.id);
                    }
                  }}
                >
                  {document.title}
                </button>
              ),
            )}
          </nav>
        )}
        <MarkdownDocument source={documentSource} />
      </GroupCard>
    </main>
  );
}

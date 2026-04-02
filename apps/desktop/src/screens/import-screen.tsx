import { startTransition, useEffect, useState } from "react";
import { GroupCard } from "../components/group-card";
import { GroupTags } from "../components/group-tags";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const [query, setQuery] = useState(viewModel.importSubmittedQuery);
  const content = viewModel.content;

  useEffect(() => {
    startTransition(() => {
      void viewModel.loadImportPageIfNeeded();
    });
  }, [viewModel]);

  return (
    <main>
      <h1>Import Sources</h1>
      <form>
        <input
          data-testid="import-search-input"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <button
          data-testid="import-search-submit"
          type="button"
          onClick={() => {
            startTransition(() => {
              void viewModel.submitSearch(query);
            });
          }}
        >
          Search
        </button>
      </form>
      {content.kind === "recommended" ? (
        <section>
          <h2>Recommended Imports</h2>
          {content.sections.map((section) => (
            <section key={section.categoryId}>
              <h3>{section.title}</h3>
              {section.groups.map((group) => {
                const draft = viewModel.draftsByItemId[group.id];
                const selectedSkillIds = draft?.selectedSkillIds ?? group.skills.map((skill) => skill.id);
                const enabledTargetIds = draft?.enabledTargetIds ?? [];

                return (
                  <GroupCard
                    key={group.id}
                    title={group.id}
                    subtitle={group.recommendationDescription ?? "Draft import selection"}
                  >
                    <p>{group.previewPhase.kind}</p>
                    <button
                      type="button"
                      data-preview-group-id={group.id}
                      onClick={() => {
                        startTransition(() => {
                          void viewModel.previewImportGroupIfNeeded(group.id);
                        });
                      }}
                    >
                      Preview
                    </button>
                    <p>Skills</p>
                    <GroupTags tags={selectedSkillIds} />
                    <p>Targets</p>
                    <GroupTags tags={enabledTargetIds.length > 0 ? enabledTargetIds : group.targets.map((target) => target.id)} />
                  </GroupCard>
                );
              })}
            </section>
          ))}
        </section>
      ) : (
        <section>
          <h2>Search Results</h2>
          <p>{viewModel.importSubmittedQuery}</p>
          <p>{viewModel.searchPhase.kind}</p>
          {content.groups.map((group) => (
            <GroupCard key={group.id} title={group.id} subtitle={group.locator}>
              <p>{group.previewPhase.kind}</p>
              <p>Skills</p>
              <GroupTags tags={group.skills.map((skill) => skill.id)} />
              <p>Targets</p>
              <GroupTags tags={group.targets.map((target) => target.id)} />
            </GroupCard>
          ))}
        </section>
      )}
    </main>
  );
}

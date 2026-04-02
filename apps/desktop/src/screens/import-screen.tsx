import { startTransition, useEffect, useState } from "react";
import { GroupCard } from "../components/group-card";
import { GroupTags } from "../components/group-tags";
import { localize, localizePhaseKind } from "../i18n";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const [query, setQuery] = useState(viewModel.importSubmittedQuery);
  const content = viewModel.content;

  useEffect(() => {
    startTransition(() => {
      void viewModel.loadImportPageIfNeeded();
    });
  }, [viewModel]);

  useEffect(() => {
    setQuery(viewModel.importSubmittedQuery);
  }, [viewModel.importSubmittedQuery]);

  return (
    <main>
      <h1>{t("page.import.title")}</h1>
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
          {t("action.search")}
        </button>
      </form>
      {content.kind === "recommended" ? (
        <section>
          <h2>{t("page.import.recommended")}</h2>
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
                    subtitle={group.recommendationDescription ?? t("page.import.draft_selection")}
                  >
                    <p>{localizePhaseKind(group.previewPhase.kind, viewModel.desktopLanguage)}</p>
                    <button
                      type="button"
                      data-preview-group-id={group.id}
                      onClick={() => {
                        startTransition(() => {
                          void viewModel.previewImportGroupIfNeeded(group.id);
                        });
                      }}
                    >
                      {t("action.preview")}
                    </button>
                    <button
                      type="button"
                      data-import-group-id={group.id}
                      onClick={() => {
                        startTransition(() => {
                          void viewModel.importGroup(group.id);
                        });
                      }}
                    >
                      {group.isInstalledLocally ? t("state.installed") : t("action.import")}
                    </button>
                    <p>{t("page.import.skills")}</p>
                    <GroupTags tags={selectedSkillIds} />
                    <p>{t("page.import.targets")}</p>
                    <GroupTags tags={enabledTargetIds.length > 0 ? enabledTargetIds : group.targets.map((target) => target.id)} />
                  </GroupCard>
                );
              })}
            </section>
          ))}
        </section>
      ) : (
        <section>
          <h2>{t("page.import.search_results")}</h2>
          <p>{viewModel.importSubmittedQuery}</p>
          <p>{localizePhaseKind(viewModel.searchPhase.kind, viewModel.desktopLanguage)}</p>
          {content.groups.map((group) => (
            <GroupCard key={group.id} title={group.id} subtitle={group.locator}>
              <p>{localizePhaseKind(group.previewPhase.kind, viewModel.desktopLanguage)}</p>
              <p>{t("page.import.skills")}</p>
              <GroupTags tags={group.skills.map((skill) => skill.id)} />
              <p>{t("page.import.targets")}</p>
              <GroupTags tags={group.targets.map((target) => target.id)} />
            </GroupCard>
          ))}
        </section>
      )}
    </main>
  );
}

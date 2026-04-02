import { GroupCard } from "../components/group-card";
import { GroupTags } from "../components/group-tags";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const content = viewModel.content;

  return (
    <main>
      <h1>Import Sources</h1>
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
          {content.groups.map((group) => (
            <GroupCard key={group.id} title={group.id} subtitle={group.locator}>
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

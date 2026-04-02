import { GroupCard } from "../components/group-card";
import { GroupTags } from "../components/group-tags";
import { ImportViewModel } from "../view-models/import-view-model";

type ImportScreenProps = {
  viewModel: ImportViewModel;
};

export function ImportScreen({ viewModel }: ImportScreenProps) {
  const drafts = Object.entries(viewModel.draftsByItemId);

  return (
    <main>
      <h1>Import Sources</h1>
      <section>
        <h2>Recommended Imports</h2>
        {drafts.map(([itemId, draft]) => (
          <GroupCard key={itemId} title={itemId} subtitle="Draft import selection">
            <p>Skills</p>
            <GroupTags tags={draft.selectedSkillIds} />
            <p>Targets</p>
            <GroupTags tags={draft.enabledTargetIds} />
          </GroupCard>
        ))}
      </section>
    </main>
  );
}

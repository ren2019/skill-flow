import { DetailViewModel } from "../view-models/detail-view-model";

type DetailSidebarProps = {
  viewModel: DetailViewModel;
};

export function DetailSidebar({ viewModel }: DetailSidebarProps) {
  const detail = viewModel.detail;
  const sourceId = viewModel.sourceId;

  if (!detail || !sourceId) {
    return null;
  }

  return (
    <aside data-view="detail-sidebar">
      <button
        type="button"
        data-group-overview-id={sourceId}
        onClick={() => {
          viewModel.showOverview();
        }}
      >
        Overview
      </button>
      <h2>Skills</h2>
      <ul>
        {detail.skills.map((skill) => (
          <li key={skill.id}>
            <button
              type="button"
              data-skill-id={skill.id}
              onClick={() => {
                viewModel.selectSkill(skill.id);
              }}
            >
              {skill.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

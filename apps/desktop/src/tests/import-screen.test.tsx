import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { ImportScreen } from "../screens/import-screen";
import { ImportViewModel } from "../view-models/import-view-model";

describe("import screen", () => {
  it("renders recommendation and import draft sections", () => {
    const state = createDesktopAppState({
      importState: {
        draftsByItemId: {
          starter: {
            selectedSkillIds: ["skill-a", "skill-b"],
            enabledTargetIds: ["codex", "claude-code"],
          },
        },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen viewModel={new ImportViewModel(state)} />,
    );

    expect(markup).toContain("Import Sources");
    expect(markup).toContain("Recommended Imports");
    expect(markup).toContain("starter");
    expect(markup).toContain("skill-a");
    expect(markup).toContain("codex");
  });
});

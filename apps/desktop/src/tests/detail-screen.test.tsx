import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { desktopRoute } from "../navigation/desktop-route";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DetailScreen } from "../screens/detail-screen";
import { DetailViewModel } from "../view-models/detail-view-model";

describe("detail screen", () => {
  it("renders the selected source id and a markdown document placeholder", () => {
    const state = createDesktopAppState({
      view: {
        currentRoute: desktopRoute.detail("alpha"),
        selectedSourceId: "alpha",
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: ["Claude Code", "Codex"],
            fileTree: [
              {
                id: "root/skill-a",
                title: "skill-a",
                path: "/alpha/skill-a",
                isDirectory: true,
                isSkillRoot: true,
                isSkillDocument: false,
                skillId: "skill-a",
                children: [],
              },
            ],
            groupDocuments: [
              {
                id: "readme",
                title: "README.md",
                path: "README.md",
                metadata: [],
                renderCacheKey: "readme",
                content: "# Alpha",
                isLoaded: true,
              },
            ],
            targets: [],
            skills: [
              {
                id: "skill-a",
                title: "Browse",
                isEnabled: true,
                documents: [],
              },
            ],
            sourceFacts: ["Updated yesterday"],
            deploymentFacts: ["Claude Code -> ~/.claude"],
            skillSelection: "partial",
            targetSelection: "full",
          },
        },
      },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("Source Detail");
    expect(markup).toContain("Alpha");
    expect(markup).toContain("README");
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("skill-a");
    expect(markup).toContain("# Alpha");
  });

  it("renders an empty detail state when no source is selected", () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(createDesktopAppState())} />,
    );

    expect(markup).toContain("No source selected");
  });
});

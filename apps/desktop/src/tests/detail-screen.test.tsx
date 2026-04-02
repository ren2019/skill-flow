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
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen viewModel={new DetailViewModel(state)} />,
    );

    expect(markup).toContain("Source Detail");
    expect(markup).toContain("alpha");
    expect(markup).toContain("README");
    expect(markup).toContain("No detail content loaded yet.");
  });
});

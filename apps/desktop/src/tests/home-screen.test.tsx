import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { HomeViewModel } from "../view-models/home-view-model";
import { HomeScreen } from "../screens/home-screen";

describe("home screen", () => {
  it("renders installed inventory groups and source ids", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha", "beta"] },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("Installed Skills");
    expect(markup).toContain("alpha");
    expect(markup).toContain("beta");
  });
});

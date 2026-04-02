import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { localize } from "../i18n";
import { HomeScreen } from "../screens/home-screen";
import { createDesktopAppState } from "../store/desktop-app-state";
import { HomeViewModel } from "../view-models/home-view-model";

describe("desktop localization", () => {
  it("loads translated strings and falls back to english", () => {
    expect(localize("page.settings.title", "en")).toBe("Settings");
    expect(localize("page.settings.title", "zh-Hans")).toBe("设置");
    expect(localize("test.fallback.only_en", "zh-Hans")).toBe("Only English");
  });

  it("renders home screen labels in the selected desktop language", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      settings: { desktopLanguageRawValue: "zh-Hans" },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("已安装技能");
    expect(markup).toContain("刷新");
    expect(markup).toContain("全部更新");
  });
});

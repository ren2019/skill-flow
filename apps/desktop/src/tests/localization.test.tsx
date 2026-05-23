import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { localize, resolveDesktopLanguage } from "../i18n";
import { DetailScreen } from "../screens/detail-screen";
import { HomeScreen } from "../screens/home-screen";
import { ImportScreen } from "../screens/import-screen";
import { SettingsScreen } from "../screens/settings-screen";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DetailViewModel } from "../view-models/detail-view-model";
import { HomeViewModel } from "../view-models/home-view-model";
import { ImportViewModel } from "../view-models/import-view-model";
import { SettingsViewModel } from "../view-models/settings-view-model";

describe("desktop localization", () => {
  it("loads translated strings and falls back to english", () => {
    expect(localize("page.settings.title", "en")).toBe("Settings");
    expect(localize("page.settings.title", "zh-Hans")).toBe("设置");
    expect(localize("test.fallback.only_en", "zh-Hans")).toBe("Only English");
  });

  it("resolves follow-system language from common locale tags", () => {
    expect(resolveDesktopLanguage("system", { systemLocale: "zh-CN" })).toBe("zh-Hans");
    expect(resolveDesktopLanguage("system", { systemLocale: "zh-Hans-CN" })).toBe("zh-Hans");
    expect(resolveDesktopLanguage("system", { systemLocale: "en-US" })).toBe("en");
    expect(resolveDesktopLanguage("system", { systemLocale: "ja-JP" })).toBe("ja");
    expect(resolveDesktopLanguage("system", { systemLocale: "fr-FR" })).toBe("en");
    expect(resolveDesktopLanguage("zh_CN")).toBe("zh-Hans");
    expect(resolveDesktopLanguage("zh-Hans-SG")).toBe("zh-Hans");
    expect(resolveDesktopLanguage("en-US")).toBe("en");
    expect(resolveDesktopLanguage("ja_JP")).toBe("ja");
  });

  it("renders home screen labels in the selected desktop language", () => {
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
      settings: { desktopLanguageRawValue: "zh-Hans" },
    });

    const markup = ReactDOMServer.renderToStaticMarkup(
      <HomeScreen viewModel={new HomeViewModel(state)} />,
    );

    expect(markup).toContain("搜索分组或作者");
    expect(markup).toContain("范围");
    expect(markup).toContain("导入");
    expect(markup).toContain("全部更新");
  });

  it("loads localized strings from the japanese catalog and keeps english fallback", () => {
    expect(localize("page.settings.title", "ja")).toBe("設定");
    expect(localize("project_scope.global", "ja")).toBe("グローバル");
    expect(localize("detail.document.file_tree", "ja")).toBe("ファイルツリー");
    expect(localize("detail.updated.unavailable", "ja")).toBe("更新時刻を取得できません");
    expect(localize("group_tag.input.placeholder", "ja")).toBe("タグ");
    expect(localize("test.fallback.only_en", "ja")).toBe("Only English");
  });

  it("renders import, detail, and settings labels in the selected desktop language", () => {
    const importMarkup = ReactDOMServer.renderToStaticMarkup(
      <ImportScreen
        viewModel={
          new ImportViewModel(
            createDesktopAppState({
              settings: { desktopLanguageRawValue: "zh-Hans" },
              importState: {
                recommendedGroups: [
                  {
                    id: "starter",
                    title: "Starter",
                    locator: "obra/starter",
                    previewPhase: { kind: "ready" },
                    skills: [{ id: "skill-a", selectedByDefault: true }],
                    targets: [{ id: "codex", selectedByDefault: true }],
                  },
                ],
              },
            }),
          )
        }
      />
    );
    const detailMarkup = ReactDOMServer.renderToStaticMarkup(
      <DetailScreen
        viewModel={
          new DetailViewModel(
            createDesktopAppState({
              settings: { desktopLanguageRawValue: "zh-Hans" },
              view: {
                currentRoute: { kind: "detail", sourceId: "alpha" },
                selectedSourceId: "alpha",
              },
              detailState: {
                detailsBySourceId: {
                  alpha: {
                    sourceId: "alpha",
                    title: "Alpha",
                    enabledTargetLabels: ["Codex"],
                    fileTree: [],
                    groupDocuments: [],
                    targets: [{ id: "codex", label: "Codex", isEnabled: true }],
                    skills: [{ id: "skill-a", title: "Skill A", isEnabled: true, documents: [] }],
                    sourceFacts: [],
                    deploymentFacts: [],
                    skillSelection: "full",
                    targetSelection: "full",
                  },
                },
              },
            }),
          )
        }
      />
    );
    const settingsMarkup = ReactDOMServer.renderToStaticMarkup(
      <SettingsScreen
        viewModel={
          new SettingsViewModel(
            createDesktopAppState({
              settings: { desktopLanguageRawValue: "zh-Hans" },
            }),
          )
        }
      />
    );

    expect(importMarkup).toContain("导入来源");
    expect(importMarkup).toContain("搜索");
    expect(importMarkup).toContain("技能");
    expect(detailMarkup).toContain("来源详情");
    expect(detailMarkup).toContain("概览");
    expect(settingsMarkup).toContain("设置");
    expect(settingsMarkup).toContain("登录时启动");
    expect(settingsMarkup).toContain("更新状态");
  });
});

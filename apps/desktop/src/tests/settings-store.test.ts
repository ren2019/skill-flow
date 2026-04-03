import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { DesktopSettingsStore } from "../runtime/settings-store";

function createMemoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      values.set(key, value);
    },
  };
}

describe("settings store", () => {
  it("starts with the expected desktop settings slice defaults", () => {
    const state = createDesktopAppState();

    expect(state.settings.logLevel).toBe("info");
    expect(state.settings.themeModeRawValue).toBe("light");
    expect(state.settings.themeAccentRawValue).toBe("blue");
    expect(state.settings.homeCardDensityRawValue).toBe("comfortable");
    expect(state.settings.menuCardDensityRawValue).toBe("compact");
    expect(state.settings.selectedProjectScope).toEqual({ kind: "global" });
    expect(state.settings.recentProjectScopes).toEqual([]);
    expect(state.settings.agentDisplayPreferences).toEqual([]);
  });

  it("loads and persists desktop settings state", () => {
    const storage = createMemoryStorage();
    const store = new DesktopSettingsStore(storage);

    const state = store.load();
    state.logLevel = "debug";
    state.homeCardDensityRawValue = "compact";
    state.menuCardDensityRawValue = "comfortable";
    state.selectedProjectScope = { kind: "project", projectId: "repo-a" };
    state.recentProjectScopes = [
      {
        projectId: "repo-a",
        title: "Repo A",
        lastActivityAt: "2026-03-31T12:00:00.000Z",
        tools: ["codex"],
      },
    ];
    state.agentDisplayPreferences = [
      { targetId: "codex", isVisible: false, sortOrder: 0 },
      { targetId: "claude-code", isVisible: true, sortOrder: 1 },
    ];

    store.save(state);

    const reloaded = store.load();
    expect(reloaded.logLevel).toBe("debug");
    expect(reloaded.homeCardDensityRawValue).toBe("compact");
    expect(reloaded.menuCardDensityRawValue).toBe("comfortable");
    expect(reloaded.selectedProjectScope).toEqual({ kind: "project", projectId: "repo-a" });
    expect(reloaded.recentProjectScopes[0]).toEqual({
      projectId: "repo-a",
      title: "Repo A",
      lastActivityAt: "2026-03-31T12:00:00.000Z",
      tools: ["codex"],
    });
    expect(reloaded.agentDisplayPreferences.slice(0, 2)).toEqual([
      { targetId: "codex", isVisible: false, sortOrder: 0 },
      { targetId: "claude-code", isVisible: true, sortOrder: 1 },
    ]);
  });
});

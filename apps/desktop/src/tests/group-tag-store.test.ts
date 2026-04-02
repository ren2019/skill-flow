import { describe, expect, it } from "vitest";
import { DesktopGroupTagStore } from "../runtime/group-tag-store";

describe("group tag store", () => {
  it("loads legacy single-tag payloads into array shape", () => {
    const storage = new Map<string, string>();
    storage.set(
      DesktopGroupTagStore.customTagsKey,
      JSON.stringify({
        alpha: { id: "focus", title: "Focus" },
      }),
    );
    const store = new DesktopGroupTagStore({
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
    });

    expect(store.loadCustomTags()).toEqual({
      alpha: [{ id: "focus", title: "Focus" }],
    });
  });
});

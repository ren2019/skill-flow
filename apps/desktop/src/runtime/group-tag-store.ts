export type GroupTagPreference = {
  id: string;
  title: string;
  accent?: string;
};

export type GroupTagStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export class DesktopGroupTagStore {
  static readonly customTagsKey = "desktop.groupTags.customTagsBySourceId";

  constructor(private readonly storage: GroupTagStorage) {}

  loadCustomTags(): Record<string, GroupTagPreference[]> {
    const raw = this.storage.getItem(DesktopGroupTagStore.customTagsKey);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, GroupTagPreference[]>;
    } catch {
      return {};
    }
  }

  saveCustomTags(customTagsBySourceId: Record<string, GroupTagPreference[]>): void {
    this.storage.setItem(
      DesktopGroupTagStore.customTagsKey,
      JSON.stringify(customTagsBySourceId),
    );
  }
}

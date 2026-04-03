import { invoke } from "@tauri-apps/api/core";

export type DesktopMaintenance = {
  clearMetadataCache(): Promise<void>;
};

export function createDesktopMaintenance(): DesktopMaintenance {
  return {
    async clearMetadataCache(): Promise<void> {
      await invoke("clear_metadata_cache");
    },
  };
}

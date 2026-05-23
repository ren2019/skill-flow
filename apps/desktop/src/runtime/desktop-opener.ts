import { invoke } from "@tauri-apps/api/core";

export type DesktopOpener = {
  openExternalUrl(url: string): Promise<void>;
  openPath(path: string): Promise<void>;
};

export function createDesktopOpener(): DesktopOpener {
  return {
    async openExternalUrl(url) {
      const normalizedUrl = url.trim();
      if (!normalizedUrl) {
        return;
      }
      await invoke("open_external_url", { url: normalizedUrl });
    },
    async openPath(path) {
      const normalizedPath = path.trim();
      if (!normalizedPath) {
        return;
      }
      await invoke("open_path", { path: normalizedPath });
    },
  };
}

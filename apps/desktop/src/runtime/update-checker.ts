export type DesktopReleaseInfo = {
  version: string;
  releaseUrl: string;
};

export type UpdateCheckerFetcher = (input: string) => Promise<{
  ok: boolean;
  json(): Promise<{ tag_name: string; html_url: string }>;
}>;

export class DesktopUpdateChecker {
  private readonly latestReleaseUrl =
    "https://api.github.com/repos/VintLin/skill-flow/releases/latest";

  constructor(private readonly fetcher: UpdateCheckerFetcher = (input) => fetch(input) as never) {}

  async fetchLatestRelease(): Promise<DesktopReleaseInfo> {
    const response = await this.fetcher(this.latestReleaseUrl);
    if (!response.ok) {
      throw new Error("Invalid latest release response.");
    }

    const payload = await response.json();
    if (!payload.html_url) {
      throw new Error("Latest release URL is invalid.");
    }

    return {
      version: normalizeVersion(payload.tag_name),
      releaseUrl: payload.html_url,
    };
  }
}

export function normalizeVersion(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (trimmed.startsWith("v") || trimmed.startsWith("V")) {
    return trimmed.slice(1);
  }
  return trimmed;
}

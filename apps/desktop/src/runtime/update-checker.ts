export type DesktopReleaseInfo = {
  version: string;
  releaseUrl: string;
};

export type UpdateCheckerFetcher = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  url: string;
}>;

export class DesktopUpdateChecker {
  private readonly latestReleaseUrl =
    "https://github.com/VintLin/skill-flow/releases/latest";

  constructor(private readonly fetcher: UpdateCheckerFetcher = (input) => fetch(input) as never) {}

  async fetchLatestRelease(): Promise<DesktopReleaseInfo> {
    const response = await this.fetcher(this.latestReleaseUrl, { method: "HEAD" });
    if (!response.ok) {
      throw new Error("Invalid latest release response.");
    }

    const releaseUrl = response.url;
    const version = versionFromReleaseUrl(releaseUrl);
    if (!version) {
      throw new Error("Latest release URL is invalid.");
    }

    return {
      version,
      releaseUrl,
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

function versionFromReleaseUrl(rawValue: string): string | undefined {
  const match = rawValue.match(/\/releases\/tag\/([^/?#]+)(?:[?#].*)?$/);
  return match?.[1] ? normalizeVersion(decodeURIComponent(match[1])) : undefined;
}

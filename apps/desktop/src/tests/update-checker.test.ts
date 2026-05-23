import { describe, expect, it, vi } from "vitest";
import { DesktopUpdateChecker, normalizeVersion } from "../runtime/update-checker";

describe("desktop update checker", () => {
  it("fetches latest release through the GitHub latest redirect URL", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      url: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.6",
    });
    const checker = new DesktopUpdateChecker(fetcher);

    const release = await checker.fetchLatestRelease();

    expect(fetcher).toHaveBeenCalledWith(
      "https://github.com/VintLin/skill-flow/releases/latest",
      { method: "HEAD" },
    );
    expect(release).toEqual({
      version: "1.3.6",
      releaseUrl: "https://github.com/VintLin/skill-flow/releases/tag/v1.3.6",
    });
  });

  it("rejects non-release redirect URLs", async () => {
    const checker = new DesktopUpdateChecker(vi.fn().mockResolvedValue({
      ok: true,
      url: "https://github.com/VintLin/skill-flow/releases",
    }));

    await expect(checker.fetchLatestRelease()).rejects.toThrow("Latest release URL is invalid.");
  });

  it("normalizes version prefixes", () => {
    expect(normalizeVersion("v1.3.6")).toBe("1.3.6");
    expect(normalizeVersion("V1.3.6")).toBe("1.3.6");
    expect(normalizeVersion("1.3.6")).toBe("1.3.6");
  });
});

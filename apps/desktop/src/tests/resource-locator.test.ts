import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resourceDirectories } from "../runtime/resource-locator";

describe("resource locator", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("prefers existing bundle directories before the source root and de-duplicates", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "desktop-resource-locator-"));
    tempRoots.push(tempRoot);

    const mainResourceRoot = path.join(tempRoot, "main");
    const explicitBundleRoot = path.join(tempRoot, "explicit");
    const sourceRoot = path.join(tempRoot, "source");
    fs.mkdirSync(path.join(mainResourceRoot, "AgentIcons"), { recursive: true });
    fs.mkdirSync(path.join(explicitBundleRoot, "AgentIcons"), { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, "AgentIcons"), { recursive: true });

    const directories = resourceDirectories({
      subdirectory: "AgentIcons",
      mainResourceUrl: mainResourceRoot,
      bundleResourceUrl: explicitBundleRoot,
      runtimeResourceUrl: explicitBundleRoot,
      sourceRoot,
    });

    expect(directories).toEqual([
      path.join(mainResourceRoot, "AgentIcons"),
      mainResourceRoot,
      path.join(explicitBundleRoot, "AgentIcons"),
      explicitBundleRoot,
      path.join(sourceRoot, "AgentIcons"),
      sourceRoot,
    ]);
  });
});

import fs from "node:fs";
import path from "node:path";

export type ResourceDirectoryOptions = {
  subdirectory?: string;
  mainResourceUrl?: string;
  bundleResourceUrl?: string;
  runtimeResourceUrl?: string;
  sourceRoot?: string;
};

export function resourceDirectories(options: ResourceDirectoryOptions): string[] {
  const seen = new Set<string>();
  const directories: string[] = [];

  for (const root of [
    options.mainResourceUrl,
    options.bundleResourceUrl,
    options.runtimeResourceUrl,
  ]) {
    addCandidate(directories, seen, root, options.subdirectory);
  }

  addCandidate(directories, seen, options.sourceRoot, options.subdirectory);
  return directories;
}

function addCandidate(
  directories: string[],
  seen: Set<string>,
  root: string | undefined,
  subdirectory: string | undefined,
): void {
  if (!root) {
    return;
  }

  const candidates = subdirectory ? [path.join(root, subdirectory), root] : [root];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate) || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    directories.push(candidate);
  }
}

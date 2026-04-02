import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repoRootUrl = new URL("../../../", import.meta.url);
const helperRootUrl = new URL("../src-tauri/gen/helper/", import.meta.url);
const helperDistUrl = new URL("dist/", helperRootUrl);
const helperPackageJsonPath = fileURLToPath(new URL("package.json", helperDistUrl));
const helperOutputPath = fileURLToPath(new URL("cli.js", helperDistUrl));

const helperEntryPoint = `
import { stdin, stdout, stderr } from "node:process";
import { SkillFlowApp } from "@skill-flow/query/runtime";
import { executeBridgeRequest } from "./apps/cli/src/bridge-command.ts";
import { buildBridgeResponse, parseBridgeRequest } from "./packages/shared-types/src/protocol.ts";

async function readStdin() {
  let requestInput = "";
  for await (const chunk of stdin) {
    requestInput += chunk;
  }
  return requestInput.trim();
}

function writeResponse(response) {
  stdout.write(JSON.stringify(response));
  stdout.write("\\n");
}

function writeFailure(message) {
  stderr.write(message);
  stderr.write("\\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const jsonFlag = argv[1];
  const requestArgIndex = argv.indexOf("--request");
  const requestInput = requestArgIndex >= 0 ? argv[requestArgIndex + 1] ?? "" : await readStdin();

  if (command !== "bridge") {
    writeFailure("helper only supports 'bridge'.");
    process.exitCode = 2;
    return;
  }

  if (jsonFlag !== "--json") {
    writeFailure("bridge requires --json.");
    process.exitCode = 2;
    return;
  }

  if (!requestInput) {
    writeResponse(
      buildBridgeResponse({
        command: "list",
        ok: false,
        errors: [
          {
            code: "BRIDGE_EMPTY_REQUEST",
            message: "Bridge request payload is empty.",
          },
        ],
      }),
    );
    process.exitCode = 1;
    return;
  }

  let request;
  try {
    request = parseBridgeRequest(JSON.parse(requestInput));
  } catch (error) {
    writeResponse(
      buildBridgeResponse({
        command: "list",
        ok: false,
        errors: [
          {
            code: "BRIDGE_REQUEST_INVALID",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      }),
    );
    process.exitCode = 1;
    return;
  }

  const response = await executeBridgeRequest(new SkillFlowApp(), request);
  writeResponse(response);
  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  writeFailure(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
`;

await rm(fileURLToPath(helperDistUrl), { recursive: true, force: true });
await mkdir(fileURLToPath(helperDistUrl), { recursive: true });
await writeFile(helperPackageJsonPath, '{"type":"commonjs"}\n');

await build({
  stdin: {
    contents: helperEntryPoint,
    resolveDir: fileURLToPath(repoRootUrl),
    sourcefile: "desktop-bridge-helper.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  packages: "bundle",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.DEV": '"false"',
  },
  outfile: helperOutputPath,
});

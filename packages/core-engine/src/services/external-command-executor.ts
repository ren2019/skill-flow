import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

export type ExternalCommandStep = {
  command: string;
  argv: string[];
};

export type ExternalCommandRun = {
  ok: boolean;
  output: string;
  errorCode?: "EXTERNAL_COMMAND_FAILED" | "EXTERNAL_COMMAND_SYNTAX" | "EXTERNAL_COMMAND_EMPTY";
  message?: string;
};

/**
 * Executes an externally managed source's command chain (install/update/version).
 * Commands are always run via execFile with `&&` chains split into sequential
 * steps — never through a shell — so stored command text cannot smuggle shell
 * syntax. Other shell operators are rejected up front.
 */
export async function runExternalCommandChain(
  purpose: string,
  input: {
    command: string;
    onStep: (step: string) => void;
  },
): Promise<ExternalCommandRun> {
  const trimmed = input.command.trim();
  if (!trimmed) {
    return {
      ok: false,
      output: "",
      errorCode: "EXTERNAL_COMMAND_EMPTY",
      message: `The ${purpose} command is empty.`,
    };
  }

  const withoutChaining = trimmed.replace(/&&/g, " ");
  if (/[;|>&]|\$\(/.test(withoutChaining)) {
    return {
      ok: false,
      output: "",
      errorCode: "EXTERNAL_COMMAND_SYNTAX",
      message:
        `The ${purpose} command uses shell syntax beyond '&&' chaining (${trimmed}); only plain commands chained with '&&' are supported.`,
    };
  }

  const steps = trimmed.split("&&").map((step) => step.trim()).filter(Boolean);
  const outputs: string[] = [];
  for (const step of steps) {
    input.onStep(step);
    const argv = tokenizeCommand(step);
    const command = argv[0] ?? "";
    try {
      const { stdout } = await execFileAsync(command, argv.slice(1), {
        encoding: "utf8",
        timeout: COMMAND_TIMEOUT_MS,
        env: process.env,
      });
      outputs.push(stdout);
    } catch (error) {
      const failure = error as { message?: string; stderr?: string; killed?: boolean };
      return {
        ok: false,
        output: outputs.join("\n"),
        errorCode: "EXTERNAL_COMMAND_FAILED",
        message: `The ${purpose} command step '${step}' failed: ${failure.killed
          ? "timed out"
          : failure.stderr?.trim() || failure.message || "unknown error"}`,
      };
    }
  }

  return { ok: true, output: outputs.join("\n") };
}

function tokenizeCommand(step: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  for (const char of step) {
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === " " || char === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

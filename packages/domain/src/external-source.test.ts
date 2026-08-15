import { describe, expect, test } from "vitest";
import { validateExternalSourceCommands } from "./types.js";

describe("externally managed sources", () => {
  test("a watch source carries no external commands", () => {
    expect(() => validateExternalSourceCommands("watch", { install: "echo hi" })).toThrow(
      /watch/i,
    );
  });

  test("a command source requires an install or update command", () => {
    expect(() => validateExternalSourceCommands("command", {})).toThrow(/install|update/i);
    expect(validateExternalSourceCommands("command", { update: "tool upgrade" })).toBeUndefined();
    expect(validateExternalSourceCommands("command", { install: "tool install" })).toBeUndefined();
  });

  test("external commands are rejected on checkout kinds", () => {
    expect(() => validateExternalSourceCommands("local", { install: "echo hi" })).toThrow(
      /externally managed/i,
    );
  });
});

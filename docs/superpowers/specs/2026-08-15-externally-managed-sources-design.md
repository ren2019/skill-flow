# Externally Managed Sources Design

## Summary

Some tools distribute their own skill files (e.g. agent-reach: `pipx` upgrades the CLI, then the CLI copies SKILL.md into agent target directories). Today skill-flow cannot represent these skills except as doctor warnings or import candidates, and registering the repo as a `git` source creates a second, divergent copy — the version-skew failure mode that motivated issue #12.

This design adds two source kinds under the "Externally Managed" umbrella:

- **`command`** (命令安装): skill-flow runs user-provided install/update commands, then discovers and hashes what landed on disk.
- **`watch`** (仅观察): no commands; skill-flow records observed paths and hashes only, so the skill appears in the catalog and stops the unmanaged-skill doctor warning.

skill-flow never writes these files during normal operation. Removal is split: **Unregister** deletes the record only; **Delete Files** is a separate explicit action that deletes files and keeps the record (card becomes Not Installed).

Related: ADR `0003-externally-managed-source-kinds.md`; vocabulary in `CONTEXT.md` → "Externally managed sources". Issue #4 (custom global dirs) extends the discovery scope later.

## Goals

- Represent self-distributing tools in the catalog without taking over their files.
- Delegated install/update via configured commands, executed safely (audit-logged, confirmed in interactive surfaces).
- Drift detection for externally managed files using existing content-hash machinery.
- Queue and card UX identical to other kinds — no special casing in the Group Operation Queue.

## Non-Goals

- Upstream version probe and update-available badge (fields land now, probe/badge deferred to a follow-up issue).
- Automatic fingerprint classification of tools during bootstrap scan.
- New modes for user-maintained directories (`local` kind covers them) or self-managed git clones (`git` kind covers them).
- Changing `local` kind copy semantics to in-place references.
- Scanning roots of targets that are not configured (e.g. `~/.agents/skills`) — waits for issue #4.
- CLI/TUI queue protocol changes.

## Problem Statement

Current facts (verified against code and a live machine):

- `SourceKind` is `"git" | "local" | "clawhub" | "collection"` (`packages/domain/src/types.ts:15`); every kind gets a managed checkout under `~/.skillflow/source/<kind>/`. There is no "registered but skill-flow holds no checkout" concept.
- `WorkspaceBootstrapService.detectUnmanagedExternalSkills` finds SKILL.md dirs in agent target roots; `doctor` flags them `UNMANAGED_EXTERNAL_TARGET_SKILL`. An agent-reach skill today is a warning, never a catalog entry.
- Existing adoption is takeover: local import copies files into the store and (in agent roots) replaces the original directory with a symlink.
- agent-reach writes real directory copies (not symlinks) into multiple agent dirs and writes no third-party lock file skill-flow could read; the disk is the only source of truth for where its files live.
- No per-source command/config fields exist anywhere in state today; no installed-vs-upstream version comparison exists in production code.

## User Decisions Confirmed

- Two new kinds (not an attribute on existing kinds); names `command` / `watch`; umbrella "Externally Managed".
- Install command is in v1: users paste install + update commands and never type file paths; observed paths are always discovered from disk (after running install, or at register time if files already exist).
- Update for `command` runs the external command, then re-hashes. Update All covers these sources like any other.
- Version probe fields (`versionCommand`, recorded local version) land in this issue; upstream release lookup and badge UI are deferred.
- Unregister (record only) and Delete Files (files only, keep record) are two independent actions.
- Execution: skill-flow runs commands itself via `execFile` semantics (no shell concatenation; `&&` chains split into sequential steps), writes them to the audit log, and shows them for confirmation on interactive surfaces; CLI runs directly since the user just invoked update.
- Commands live on the source record in Shared Skill State; a small built-in preset registry (agent-reach → default commands) pre-fills the add form and is user-editable.
- Install is a third Group Operation kind (Update | Import | Install), reusing queue, Card Operation Feedback, and toast rules.
- Discovery scans only currently configured target roots.

## Design

### 1. Domain types

- Add `"command"` and `"watch"` to `SOURCE_KINDS` (`packages/domain/src/types.ts`) and to the `import-preparation-cache.ts` kind set.
- `SourceManifestRecord` gains external fields: `externalCommands?: { install?: string; update?: string; version?: string }`, `presetToolName?: string`.
- `SourceLockRecord` gains `observedPaths?: string[]` with per-path `contentHash`, plus `lastVersionOutput?: string` recorded after install/update runs the optional version command. No managed checkout: exclude both kinds from `SourceCheckoutKind`; add a revision provider variant that carries observed-path hashes instead of a checkout revision.
- Registration validation: `command` kind requires a non-empty install or update command; `watch` requires neither.

### 2. Registration

Two explicit entry points, no auto-classification:

- **watch**: a "仅追踪" choice on local-scan candidates (alongside takeover import) and `skill-flow add --watch <path>`. Registers observed paths found on disk; doctor warnings for those paths stop.
- **command**: desktop "添加外部工具" form (preset registry pre-fills agent-reach's commands; user-editable) and `skill-flow add --command --install "..." --update "..."`. If files are already on disk under configured target roots, they are discovered and recorded at register time; otherwise the card starts Not Installed.

### 3. Discovery

- Reuse `detectUnmanagedExternalSkills` classification, scoped to `getTargetScanRoots()` of configured targets.
- After any install/update command completes, re-scan those roots, diff against the source's recorded observed paths, and update hashes. The user never declares paths.
- Cards show a Not Installed state when observed paths are all missing; Install re-runs the command and re-discovers.

### 4. Update and install delegation

- Branch in `SourceAuthorityService.updateSourcesUnlocked` before the checkout swap: for `command`, execute the configured update command (execFile, `&&` split into sequential steps), then re-hash observed paths and build the same `SourceUpdateDiff`. For `watch`, update is a no-op rescan (re-hash only).
- Install runs the install command through the same seam, then discovery.
- Commands are audit-logged (reuse the audited-mutation channel used by `update-sources`), and interactive surfaces show the command text before execution.

### 5. Group Operation Queue (desktop)

- Install is a third operation kind; Operation Identity = target group + kind (Update/Import/Install).
- Card feedback: Running overlay labels `Installing` for Install; queued label per existing rules. No new queue panel.
- Update All absorbs single-group Updates for external sources exactly like other kinds.

### 6. Removal

- **Unregister** (default): delete manifest/lock records only; files untouched.
- **Delete Files** (separate button, confirm dialog): delete observed-path files; record stays; card becomes Not Installed.

### 7. Bridge surface

- No new bridge verbs required: reuse `add` (new options), `update` (kind-dependent behavior), `uninstall` (unregister semantics for these kinds) plus the existing settings path for the external-tool form. If a dedicated delete-files action is needed, extend `uninstall` with a flag rather than adding a verb; keep `BRIDGE_COMMAND_NAMES`, the catalog fixture, `bridgeCommandHandlers` (TS) and Swift `BridgeCommand` in lockstep.

### 8. Version probe groundwork

- Optional `version` command per `command` source; output recorded in the lock after install/update. Upstream lookup (GitHub release feed / homepage from SKILL.md frontmatter) and the update-available badge are a follow-up issue; all fields are additive.

## Testing

- Domain: kind validation rules (`command` requires a command; `watch` forbids them).
- Core engine: register `watch` from a fake target root → observed paths recorded, doctor warning cleared; register `command` with files absent → Not Installed; run install (stub command that creates the dirs) → paths discovered and hashed; update (stub command that edits files) → diff produced via hashes, checkout untouched.
- Update delegation never touches `~/.skillflow/source/` for these kinds.
- Bridge: add/update/uninstall round-trips for both kinds; audit log contains executed command text.
- Desktop queue: Install enqueues and runs serially; Update All covers a `command` source.

Run:

- `npm run build && npm test`
- `cd apps/desktop-mac && swift build && swift test`

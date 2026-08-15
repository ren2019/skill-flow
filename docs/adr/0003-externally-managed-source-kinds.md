# Externally managed source kinds (`command` / `watch`)

Some tools distribute their own skill files (e.g. agent-reach: `pipx` upgrades the CLI, then the CLI copies SKILL.md into agent target dirs). Registering such a repo as a `git` source creates a second, divergent copy — the exact version-skew failure mode we hit (issue #12). We add two source kinds under the "Externally Managed" umbrella: **`command`** (skill-flow runs user-provided install/update commands, then discovers and hashes what landed on disk) and **`watch`** (no commands, record + hash only, for catalog visibility and silencing the unmanaged-skill doctor warning). skill-flow never writes or deletes these files as part of normal operation; Unregister removes the record only, and Delete Files is a separate explicit action.

## Considered Options

- **New kinds `command`/`watch` (chosen)** — "skill-flow holds no checkout for it" is exactly what the existing `SourceKind` union encodes (it gates checkout behavior, revision providers, and the import-preparation cache). User-maintained dirs are already covered by `local`; self-managed git clones by `git`; only command-driven distribution and pure observation were missing.
- **Attribute on existing kinds (`managedBy`) — rejected**: `kind: "git" && external` would have to skip checkout logic everywhere; a kind in disguise.
- **One `external` kind with nullable command fields — rejected**: registration-time validation ("command source without commands") and UI branching both read better off a kind than off field nullness.
- **Hand-typed expected paths — rejected**: agent-reach decides which agent dirs it writes based on what's installed; the user doesn't know the full set. Paths are always discovered from disk (target scan roots), never declared.
- **Remind-only (never execute commands) — rejected**: running the stored command with `execFile` (no shell concatenation; `&&` chains split into sequential steps), audit logging, and interactive confirmation gives delegated updates with acceptable risk.

## Consequences

- Install becomes a third Group Operation kind (Update | Import | Install); the desktop queue and card feedback treat it like the others.
- Observed paths and content hashes live in the lock record; drift detection reuses existing hashDirectory machinery.
- Version probe fields (`versionCommand`, recorded local version) land now; upstream release lookup and the update-available badge are a deferred follow-up.
- Discovery scans only currently configured target roots; directories like `~/.agents/skills` wait for issue #4 (custom global dirs).
- A small built-in preset registry (tool name → default commands) pre-fills the add form; user-editable.

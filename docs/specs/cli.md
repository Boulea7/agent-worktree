# CLI Contract

This document describes the intended public CLI surface for a future `agent-worktree` command.

## Scope

This is a contract draft, not an implemented command set.

## Intended Command Tree

```text
agent-worktree init
agent-worktree doctor
agent-worktree compat list
agent-worktree compat show <tool>

agent-worktree attempt create
agent-worktree attempt list
agent-worktree attempt attach
agent-worktree attempt stop
agent-worktree attempt checkpoint
agent-worktree attempt merge
agent-worktree attempt cleanup
```

The command tree may appear before every command is fully implemented.
During early phases, commands outside the current implementation slice MAY return a structured `NOT_IMPLEMENTED` error.

## Output Modes

The future CLI should distinguish between:

- human-readable default output
- machine-readable `--json` output

Only machine-readable output is intended to become a strong contract early.

## Early JSON Envelope

Early implementations SHOULD use a thin machine-readable envelope:

Successful command:

```json
{
  "ok": true,
  "command": "compat.show",
  "data": {}
}
```

Failed command:

```json
{
  "ok": false,
  "command": "attempt.cleanup",
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "..."
  }
}
```

Human-readable output may vary more rapidly.

## Attempt Create Contract

`agent-worktree attempt create` currently creates a direct attempt only.

Machine-readable output for a successful create SHOULD expose the stored attempt record, including additive provenance fields when present.
In the current thin lineage/source slice, create output is expected to include `sourceKind: "direct"` and omit `parentAttemptId`.
The CLI does not yet expose public flags or commands for fork, resume, or delegated-child creation.

## Attempt List Contract

`agent-worktree attempt list` is expected to be the primary discovery command for persisted attempts.

Machine-readable output SHOULD expose per-attempt records rather than formatted terminal rows.

By default, list output SHOULD include attempts whose manifest status is `cleaned`.
Future filtering flags MAY narrow the result set, but cleaned attempts are part of the default inventory and MUST NOT be omitted simply because their worktree was removed.

If an attempt directory is present but `manifest.json` is missing, or if a manifest file cannot be parsed or validated, the CLI MUST fail the command with a structured machine-readable error.
Invalid or incomplete attempt directories MUST NOT be silently skipped as though the attempt did not exist.

An early informative shape may look like:

```json
{
  "ok": false,
  "command": "attempt.list",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid attempt manifest for att_broken."
  }
}
```

The exact summary fields are not frozen yet, but invalid-manifest visibility is part of the contract intent and silent skipping is out of contract.
When manifests contain additive provenance fields such as `sourceKind` or `parentAttemptId`, machine-readable list output SHOULD preserve them as part of the per-attempt records rather than stripping them away.
List behavior MUST remain inventory-oriented: it does not validate parent lineage graphs or require referenced parent attempts to exist.

## Attempt Cleanup Contract

`agent-worktree attempt cleanup` SHOULD identify its target with an explicit `--attempt-id` flag.
A positional attempt identifier is intentionally not part of the preferred contract.

Cleanup is intended to remove disposable runtime material such as a worktree or transient session artifacts while preserving the durable runtime manifest.
Cleanup MUST NOT treat manifest removal as success for a cleaned attempt.
Cleanup MUST return a structured success payload for exactly one targeted attempt.
Cleanup SHOULD preserve additive attempt provenance fields in the returned attempt payload and in the rewritten manifest.

Machine-readable cleanup output SHOULD be structured around explicit outcomes rather than free-form text.
The payload SHOULD distinguish at least:

- a successful cleanup
- an already-cleaned attempt
- a missing attempt
- an invalid manifest discovered during cleanup

An early informative shape may look like:

```json
{
  "ok": true,
  "command": "attempt.cleanup",
  "data": {
    "attempt": {
      "attemptId": "att_demo",
      "status": "cleaned",
      "repoRoot": "/abs/repo/root",
      "worktreePath": "/abs/worktree",
      "verification": {
        "state": "pending",
        "checks": []
      }
    },
    "cleanup": {
      "outcome": "removed",
      "worktreeRemoved": true
    }
  }
}
```

The initial `cleanup.outcome` vocabulary is intentionally small:

- `removed`
- `already_cleaned`
- `missing_worktree_converged`

If cleanup encounters an invalid manifest for the targeted attempt, the command SHOULD return a structured error payload that makes the invalid state explicit.
It MUST NOT silently skip the manifest and report success as if nothing was found.
Cleanup does not currently interpret `sourceKind` or `parentAttemptId` as live session state and MUST NOT infer delegated runtime semantics from them.

## Internal Close-Preflight Boundary

Any future internal close-preflight slice MUST remain outside the public CLI contract.
It MAY prepare internal close-oriented blockers or preconditions for future internal consumers, but it MUST NOT introduce a public `attempt close`, `attempt close --check`, or similar selector-driven close-preflight surface in this phase.
Machine-readable CLI payloads for create, list, cleanup, attach, or stop MUST NOT expose internal close-preflight state as though it were a public lifecycle contract.

## Exit Code Intent

Future implementation should keep exit codes stable for:

- success
- validation failure
- compatibility mismatch
- config error
- runtime error

Exact numeric values are intentionally not frozen yet.

## Interactive vs Headless

The CLI should support both:

- interactive operator workflows
- headless automation and orchestration workflows

## Safety Intent Mapping

The CLI should expose intent-level flags or config, not vendor-specific jargon.

Planned internal safety intents include:

- `plan_readonly`
- `workspace_write_with_approval`
- `workspace_write_auto_edit`
- `full_access`

## Machine-Readable Priority

When behavior differs between human-readable and machine-readable output:

- human-readable formatting may change
- machine-readable structure should be treated as the stabilization target

Early implementations SHOULD stabilize the shared envelope first, then the per-command `data` payloads for commands that are actually implemented.
That includes additive attempt provenance fields once they are written into the manifest contract.

## Explicitly Undefined

- exact text wording
- progress bar and spinner behavior
- colors and terminal decorations
- trace verbosity defaults
- public spawn, wait, close, or resume lifecycle commands
- internal close-preflight state as a public CLI payload or selector contract

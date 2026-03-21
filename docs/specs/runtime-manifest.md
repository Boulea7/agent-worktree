# Runtime Manifest

This document defines the intended machine-readable manifest for an agent attempt.

## Purpose

The runtime manifest is the durable record of an attempt launched by the orchestrator.

It exists so that:

- other tools can inspect attempt state
- later sessions can resume context safely
- validation outcomes remain auditable

## File Location

The intended default location is outside the tracked repository, for example:

- `~/.local/share/agent-worktree/attempts/<attempt-id>/manifest.json`

The exact storage backend is intentionally unspecified.

## Phase 1 Required Fields

```json
{
  "schemaVersion": "0.x",
  "attemptId": "att_...",
  "taskId": "task_...",
  "runtime": "codex-cli",
  "adapter": "subprocess",
  "status": "created",
  "verification": {
    "state": "pending",
    "checks": []
  }
}
```

These are the minimum fields that early validators should require.

## Recommended Early Lifecycle Fields

```json
{
  "schemaVersion": "0.x",
  "attemptId": "att_...",
  "taskId": "task_...",
  "runtime": "codex-cli",
  "adapter": "subprocess",
  "supportTier": "tier1",
  "sourceKind": "direct",
  "baseRef": "main",
  "branch": "attempt/...",
  "repoRoot": "/abs/repo/root",
  "worktreePath": "/abs/path",
  "session": {
    "backend": "tmux",
    "sessionId": "..."
  },
  "status": "created",
  "verification": {
    "state": "pending",
    "checks": []
  },
  "artifacts": [],
  "timestamps": {
    "createdAt": "",
    "updatedAt": ""
  }
}
```

These fields are recommended once worktree lifecycle commands begin to land, but they are not required for the earliest manifest validators.
`repoRoot` is an additive lifecycle field that records the canonical repository root for the attempt.
Early consumers SHOULD tolerate its absence, and later producers SHOULD prefer populating it once the worktree lifecycle exists.

## Thin Attempt Provenance Fields

Early lifecycle manifests MAY also record thin attempt provenance:

```json
{
  "sourceKind": "fork",
  "parentAttemptId": "att_parent"
}
```

The current source vocabulary is intentionally small:

- `direct`
- `resume`
- `fork`
- `delegated`

These fields are additive provenance metadata, not runtime-control state.
Early consumers SHOULD tolerate their absence for backward compatibility with older manifests.
Current producers SHOULD emit `sourceKind: "direct"` for plain `attempt create` flows and SHOULD omit `parentAttemptId` for direct attempts.
When `parentAttemptId` is present, it is an opaque reference to another attempt record; consumers SHOULD NOT treat it as proof that the parent manifest is still present, valid, or resumable.

## Required Semantics

- `attemptId` is opaque
- `taskId` groups related attempts
- `runtime` names the target tool
- `adapter` names the integration type
- `status` is minimal and externally meaningful
- `verification` records deterministic checks
- the manifest directory name and `attemptId` name the same logical attempt
- `sourceKind` records coarse provenance for the current attempt
- `parentAttemptId`, when present, points at the immediate parent attempt only

## Cleanup Semantics

The runtime manifest is intended to outlive disposable runtime material.
If an attempt is cleaned, the manifest SHOULD remain as the durable audit record for that attempt.

Cleanup MAY remove a worktree, session handle, or other transient artifacts, but it SHOULD preserve the manifest and update it to reflect the cleaned lifecycle state.
The most common visible outcome is expected to be `status: "cleaned"` plus an updated timestamp.
Phase 2 cleanup MUST NOT delete branches and MUST fail clearly when it cannot confirm a safe cleanup target.
Cleanup SHOULD preserve thin provenance fields such as `sourceKind` and `parentAttemptId` when rewriting a manifest into a cleaned state.
Any future internal close-preflight metadata MUST remain derived and non-manifest-backed in this phase; manifest rewrites for cleanup MUST NOT persist close blockers, closeability summaries, or other internal preflight-only hints as durable state.

## Minimal Status Vocabulary

- `created`
- `running`
- `paused`
- `failed`
- `verified`
- `merged`
- `cleaned`

The internal state machine may be richer, but these are the externally meaningful states for now.

## Additive Evolution Rule

Future manifest versions should prefer additive changes.
Consumers must not assume field order.
Early consumers SHOULD tolerate unknown additive fields rather than rejecting them by default.
Manifest invalidity is not the same thing as manifest absence; when a stored manifest cannot be validated, consumers SHOULD report that condition explicitly rather than treating the attempt as invisible.
Lineage/source metadata SHOULD stay coarse and opaque until a later phase standardizes session-tree lifecycle behavior.

## Explicitly Opaque

- generated internal handles
- transient process IDs
- transport-specific tokens
- debug-only provenance
- slot accounting or live child-runtime bookkeeping

## Not Yet Standardized

- checkpoint object shape
- branch-injection semantics
- stage-level scoring records
- event-bus wire format
- delegated runtime lifecycle semantics
- parent-attempt existence checks across the manifest store
- close-preflight object shape or any manifest-backed close-preflight state

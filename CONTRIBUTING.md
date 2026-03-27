# Contributing

## Current Project Stage

This repository is in an early implementation phase.

Good contributions right now:

- thin implementation slices with clear boundaries
- test-backed contract hardening
- worktree lifecycle and internal helper progression
- compatibility diagnostics that stay aligned with real behavior
- documentation updates that keep public contracts accurate

Avoid:

- widening public CLI or lifecycle surfaces without an explicit spec
- large refactors that mix unrelated cleanup with feature work
- implementation changes without tests for the affected behavior

## Preferred Workflow

Contributions should be worktree-first and checkpoint-friendly.

1. Read [README.md](README.md), [AGENTS.md](AGENTS.md), and [docs/index.md](docs/index.md).
2. Start from a clean branch or isolated git worktree rather than stacking unrelated edits in the main checkout.
3. Keep each change narrow enough to review, validate, and revert independently.
4. Prefer multiple small commits over one large mixed commit.
5. Push each completed thin slice once its targeted validation is green.

When a change spans multiple behaviors, split it into separate commits or separate pull requests whenever practical.

## Implementation Expectations

Implementation work should stay contract-first:

- preserve machine-readable behavior before improving human-facing ergonomics
- keep internal-only helpers internal
- update canonical docs when behavior or boundaries change
- follow existing naming and validation patterns unless there is a strong reason not to

For new internal helper chains, prefer a thin progression such as projection, consume, batch, then higher-order composition rather than landing an entire stack at once.

## Testing And Verification

Every implementation change should include the smallest sufficient verification for the affected surface.

Expected validation usually includes:

- targeted unit tests for the changed helper or contract
- `pnpm run typecheck`
- broader targeted tests when the change touches shared types, barrels, or invariants

Before opening or updating a pull request, review the staged diff and run:

```bash
git diff --cached --check
```

Use full-suite validation when the change is broad enough to justify it or when preparing to close a larger development window.

Pure documentation-only changes may skip tests, but the pull request or handoff note should say so explicitly.

## Public And Private Material

Commit:

- durable, shared, secret-free docs
- implementation code that matches the current documented boundary
- sanitized examples and test fixtures

Do not commit:

- `PROJECT_STATUS.local.md`
- local research notes, transcripts, or scratch files
- machine-specific paths or environment details
- personal credentials or local configuration secrets

## Pull Request Guidance

Every pull request should:

- explain the change and why it is needed
- state whether public contracts changed
- mention the validation that was run
- call out any intentionally deferred follow-up

Small, focused pull requests are preferred over broad “catch-up” branches.

# Contributing

## Current Focus

This repository is in an early implementation phase with a still-narrow public contract.

Good contributions right now:

- terminology cleanup
- compatibility and contract research
- spec improvements and maintainer-doc alignment
- implementation hardening with matching tests
- RFCs for cross-cutting changes
- documentation polish and examples

Avoid widening the public surface unless the relevant contract docs are updated in the same change.

## Workflow

1. Read [SPEC.md](SPEC.md), [README.md](README.md), and [docs/index.md](docs/index.md), and use [AGENTS.md](AGENTS.md) as the repository-specific execution and boundary companion when changing contracts, compatibility wording, or implementation boundaries.
2. Prefer a clean branch or isolated git worktree, and keep each completed thin slice checkpointed in a reviewable commit.
3. Check whether the change belongs in normal docs, an RFC, or an ADR.
4. Update public docs in the same PR as any behavior or contract change, and keep internal-only boundary notes aligned when maintainer truth changes.
5. Keep local-only research, transcripts, and scratch work out of Git.

## RFC vs ADR vs Normal Docs

- Normal docs update:
  - clarifications
  - examples
  - non-breaking reference changes
- RFC:
  - user-visible or cross-cutting changes
  - compatibility model changes
  - new public configuration or CLI surface
- ADR:
  - accepted durable decisions after direction is settled

See:

- [rfcs/README.md](rfcs/README.md)
- [docs/adrs/README.md](docs/adrs/README.md)
- [docs/maintainers/docs-policy.md](docs/maintainers/docs-policy.md)

## Pull Request Expectations

Every PR should:

- explain why the change is needed
- identify affected canonical documents
- state whether compatibility promises changed
- update docs or explicitly say why no doc update was needed

## Public vs Private Material

Commit:

- durable, shared, secret-free docs
- sanitized examples
- public compatibility guidance

Do not commit:

- transcripts
- raw research scratchpads
- personal AI settings
- machine-specific paths
- secret-bearing local config

## Handoff Hygiene

Use the ignored root file `PROJECT_STATUS.local.md` for session continuity across windows and future AI handoffs.

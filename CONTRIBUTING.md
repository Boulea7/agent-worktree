# Contributing

## Current Focus

This repository is in a research and specification phase.

Good contributions right now:

- terminology cleanup
- compatibility research
- spec improvements
- RFCs for cross-cutting changes
- documentation polish and examples

Avoid adding implementation code unless the documentation phase explicitly opens that track.

## Workflow

1. Read [README.md](README.md), [SPEC.md](SPEC.md), and [docs/index.md](docs/index.md).
2. Check whether the change belongs in normal docs, an RFC, or an ADR.
3. Update public docs in the same PR as any behavior or contract change.
4. Keep local-only research, transcripts, and scratch work out of Git.

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

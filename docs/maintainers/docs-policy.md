# Docs Policy

## Goal

Keep the repository coherent while it is still evolving quickly.

## Rules

- The committed documentation spine starts with `SPEC.md`, then `README.md`, then `docs/index.md`.
- Use `AGENTS.md` as the repository-specific execution rules and boundary companion, not as a replacement for the committed doc set.
- Update canonical docs instead of creating duplicate guidance.
- Any public contract change requires a doc update.
- If behavior changes but docs do not, explain why.
- RFCs are for cross-cutting or hard-to-reverse changes.
- ADRs are for accepted durable decisions.

## Canonical Document Classes

- public spec entry: `SPEC.md`
- product entry: `README.md`
- documentation index: `docs/index.md`
- execution rules and boundary companion: `AGENTS.md`
- public contract detail: `docs/specs/*`
- compatibility truth: `docs/compat/*`
- research synthesis: `docs/research/*`
- maintainer process: `docs/maintainers/*`

`docs/maintainers/future-super-agent-harness/*` is maintainer planning only, non-contractual, and subordinate to the current README/SPEC/RFC/ADR layers.

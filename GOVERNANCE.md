# Governance

## Principles

This project is currently optimized for:

- clarity over speed
- public contracts over internal cleverness
- research-backed decisions over hype-driven scope expansion

## Governance Model

Use a lightweight three-lane model:

1. Normal docs PR
2. RFC for cross-cutting or hard-to-reverse changes
3. ADR for accepted durable decisions

## Decision Rules

- Behavior-changing public contracts require a documentation update.
- Cross-tool compatibility changes require an RFC.
- Long-lived architectural choices should end in an ADR.

## Ownership

During the initial phase, core governance files should be reviewed carefully:

- `README.md`
- `SPEC.md`
- `AGENTS.md`
- `docs/specs/*`
- `docs/compat/*`
- `rfcs/*`
- `docs/adrs/*`

## Compatibility Governance

Support promises must be tiered:

- Tier 1: first-class support
- Experimental: best-effort support
- Future: researched but not promised

No tool should be promoted to Tier 1 without documented evidence and explicit compatibility criteria.

## Future Governance Work

- CODEOWNERS
- release roles
- maintainer admission rules
- license finalization
- security response process

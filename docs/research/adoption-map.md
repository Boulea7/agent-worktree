# Research Adoption Map

This document maps important ideas into four buckets:

- `Adopted`
- `Planned`
- `Research`
- `Do Not Spec Yet`

The goal is to stop good ideas from being either lost or prematurely frozen.

These bucket labels are research classifications, not roadmap stages.

## Adopted

These ideas are already shaping the public direction of the repository:

| Idea | Why adopted now | Where it shows up |
| --- | --- | --- |
| Worktree-native isolation | Strong practical evidence and clear product fit | `README.md`, `docs/concepts/mental-model.md`, `docs/architecture/orchestrator-model.md` |
| Verification-first selection | Highest-confidence selection primitive for coding work | `README.md`, `docs/concepts/mental-model.md`, `docs/research/mature-patterns.md` |
| Adaptive orchestration depth | Needed to support both simple and complex tasks | `README.md`, `docs/concepts/mental-model.md`, `docs/architecture/orchestrator-model.md` |
| Capability-first compatibility | Required for multi-tool friendliness | `docs/compat/*`, `docs/research/mature-patterns.md` |
| Minimal runtime manifest | Already part of the current experimental public surface, even though its shape may still change | `SPEC.md`, `docs/specs/runtime-manifest.md` |
| Minimal CLI contract | Already part of the current experimental public surface for machine-readable behavior | `SPEC.md`, `docs/specs/cli.md` |
| Public/private doc split | Necessary for long-running AI-assisted development | `README.md`, `AGENTS.md`, `docs/maintainers/research-policy.md` |

## Planned

These ideas are strong enough to shape future implementation planning, but are not yet public stable contracts:

| Idea | Why planned | Likely future location |
| --- | --- | --- |
| Attempt conditions and additive status | Better than an oversized phase machine | future refinement of `runtime-manifest.md` |
| Idempotent control operations | Important once orchestration becomes stateful | future RFC and CLI spec refinement |
| Versioned long-running attempts | Likely needed for resume safety | future architecture RFC |

## Research

These ideas are worth preserving and revisiting, but not freezing:

| Idea | Why still research | Current home |
| --- | --- | --- |
| Stage-level best-result reuse | Strong vision fit, weak operational convergence | `docs/research/future-research-tracks.md` |
| Checkpoint / fork / lineage primitives | Promising but still underspecified | `docs/research/future-research-tracks.md` |
| Process supervision | Interesting, but less mature than outcome verification | `docs/research/future-research-tracks.md` |
| Failure attribution and trajectory debugging | High potential, still immature | `docs/research/future-research-tracks.md` |
| Heterogeneous multi-model routing | Promising, not stable enough for contracts | `docs/research/future-research-tracks.md` |
| Gateway-shaped control surfaces | Valuable as influence, not core template | `docs/research/future-research-tracks.md` |
| Semantic synthesis across branches | Intriguing, but risky and underdefined | `docs/research/future-research-tracks.md` |
| Intent-scoped capability expansion | Large tool surfaces may benefit from lightweight descriptors first and deferred expansion later | `docs/research/future-research-tracks.md` |
| Execution isolation separate from policy authorization | Safe delegated execution likely needs a clearer boundary than a single “sandbox” concept, but the public contract is still unsettled | `docs/research/future-research-tracks.md` |
| Extension definition separate from activation state | Large capability surfaces may stay easier to reason about when capability metadata and enablement are not coupled, but the exact shape is still open | `docs/research/future-research-tracks.md` |

## Do Not Spec Yet

These ideas may still be interesting, but should not appear in public specs as if they are product commitments:

| Idea | Why not yet |
| --- | --- |
| Exact multi-stage scoring formulas | False precision before implementation exists |
| Public event-bus wire protocol | Too early and too architecture-specific |
| Formal ORM / PRM / ORPS system design | Overcommits to a specific research framing |
| Exact 16-phase workflow | Too rigid for the current project maturity |
| Quantitative claims about search efficiency | Not verified for this project |
| Claims of reproducing proprietary internal systems | Not evidence-backed and not needed |

## Rule Of Thumb

Use this simple test:

- If an idea improves the shared public story today, `Adopted`
- If it is likely implementation-relevant soon, `Planned`
- If it is promising but still unstable, `Research`
- If it creates false precision, `Do Not Spec Yet`

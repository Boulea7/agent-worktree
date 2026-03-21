# Vision Synthesis

This document extracts useful design signals from the research phase, including the long AI-generated framework note supplied during planning.

That note is treated as a concept draft, not a source of truth.

## Adopt Now

These ideas are strong enough to shape public direction now:

- `thin agent / thick platform` is a useful framing
- worktree-level isolation should be the core scheduling primitive
- the orchestrator should remain separate from isolated execution attempts
- deterministic validation should outrank confident prose
- stage-based thinking is valuable even if stage scoring is not implemented yet
- role separation is healthier than one agent trying to do everything

## Research Track

These ideas are promising and worth preserving, but should remain in the research lane:

- explicit checkpoint, branch, and inject primitives
- stage-level reuse of best intermediate artifacts
- event-bus orchestration
- OpenClaw-style YAML or gateway-driven coordination
- heterogeneous multi-model collaboration

## Do Not Spec Yet

These ideas should not be written into public contracts yet:

- exact 16-phase workflow
- formal ORM / PRM / ORPS architecture
- DPTS as the default orchestration algorithm
- unverified numerical claims about search efficiency
- any claim that the project already reproduces a `GPT-5.4 Pro`-like internal system

## Practical Translation

The long concept note is still useful because it sharpens the product vision:

- parallel isolated attempts are worth pursuing
- selection must be evidence-driven
- compatibility should extend beyond a single vendor
- future orchestration may become much richer than the first prototype
- the initial idea should remain adjustable rather than treated as fixed doctrine
- the platform should eventually serve both simple high-quality work and complex multi-attempt work

## Documentation Consequence

Public docs should preserve the direction while stripping away:

- false precision
- unsupported claims
- speculative metrics
- implementation assumptions that would lock the design too early

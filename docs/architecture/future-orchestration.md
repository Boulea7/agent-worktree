# Future Orchestration Tracks

This document records important future directions without turning them into premature public guarantees.

## Track 1: Checkpoint And Branch Semantics

Potential future work:

- durable checkpoints
- branch lineage
- selective reuse of intermediate results

## Track 2: Stage-Based Evaluation

Potential future work:

- evaluate attempts before final completion
- reuse locally best intermediate outcomes
- distinguish final best attempt from best stage artifact

## Track 3: Event-Driven Coordination

Potential future work:

- event bus for attempt state changes
- subscribers for review, testing, and selection
- asynchronous orchestration beyond shell sessions

## Track 4: Experimental OpenClaw Compatibility

Potential future work:

- map `agent-worktree` concepts onto OpenClaw gateway and skill packaging
- isolate coding-relevant parts from broader personal-assistant features

## Track 5: Heterogeneous Multi-Model Cooperation

Potential future work:

- routing planning-heavy stages to reasoning-focused models
- routing coding-heavy stages to coding-focused runtimes
- routing evaluation-heavy stages to faster verifier-style models

## Track 6: Internal Closeout And Lifecycle Prep

Potential future work:

- continue internal-only selection closeout hardening across report-ready, grouped reporting, closure, and closeout decision composition
- continue internal-only headless wait/close request and target-apply prep on top of the existing control-plane foundation
- keep these thin slices traceable through the maintainer phase guide without promoting them into public lifecycle guarantees

See also:

- [Development Phases](../maintainers/development-phases.md)

## Research Rule

These tracks are intentional research directions, not v1 commitments.

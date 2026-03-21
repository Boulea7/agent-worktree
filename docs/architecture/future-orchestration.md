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

## Research Rule

These tracks are intentional research directions, not v1 commitments.

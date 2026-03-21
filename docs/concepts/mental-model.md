# Mental Model

## Thin Agent, Thick Platform

The guiding idea behind `agent-worktree` is that the model should not be the only place where coordination lives.

Instead:

- the model handles reasoning and tool use
- the platform handles isolation, orchestration, verification, and traceability

## Worktree-Native

The fundamental unit of parallel work is an isolated worktree.

That choice is meant to keep:

- file changes isolated
- branches attributable
- cleanup deterministic
- retries safer

## Verification-First

Parallel generation is not enough.
The platform should favor deterministic checks over prose self-confidence when selecting outcomes.

## Compatibility-First

The project should not depend on a single vendor's internal runtime model.
It should normalize intent-level behavior and map outward to specific tools.

## Quality For Both Simple And Complex Work

The project should not assume that every task deserves maximum orchestration.

The intended direction is:

- simple tasks use the lightest workflow that still preserves quality
- complex tasks may justify parallel isolated attempts and heavier review logic

## Documentation-First

At this stage, the repository exists to make its future implementation legible before it becomes executable.

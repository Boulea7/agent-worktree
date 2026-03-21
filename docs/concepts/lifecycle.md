# Lifecycle

## Current Repository Lifecycle

The repository is intentionally staged:

1. research
2. synthesis
3. specification
4. compatibility mapping
5. prototype implementation
6. validation and hardening

## Current Implementation Rule

The repository has completed stages 1 through 4 far enough to begin stage 5 in a narrow, contract-first way.

The current implementation window should stay limited to:

- `Phase 1: Core Scaffold`
- an optional thin slice of `Phase 2: Worktree Lifecycle` only after `Phase 1` gates pass

This means the project can begin implementation while still avoiding:

- premature runtime complexity
- unstable cleanup semantics
- speculative future orchestration features

## Future Attempt Lifecycle

The likely future attempt lifecycle is:

1. task defined
2. attempt created
3. worktree prepared
4. runtime launched
5. verification executed
6. outcome selected
7. merge or discard
8. cleanup

The exact internal transitions are intentionally not finalized yet.

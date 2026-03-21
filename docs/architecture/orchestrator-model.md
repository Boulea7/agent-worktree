# Orchestrator Model

## Adopted Direction

The current architectural direction borrows a few strong ideas from the research phase:

- isolate parallel attempts physically, not just conversationally
- centralize orchestration in a main controller
- keep verification and selection deterministic where possible
- separate public contracts from internal scheduling mechanics

## Core Roles

The current concept model recognizes these roles:

- `orchestrator`
- `developer runtime`
- `review or verifier`
- `tester or validation runner`

These are conceptual roles, not fixed implementation classes yet.

## Adaptive Execution

The orchestrator should eventually support more than one quality mode:

- minimal path for simple work
- parallel candidate generation for harder work
- future stage-aware evaluation for especially complex work

This keeps the project useful for both everyday tasks and heavier engineering problems.

## Why Role Separation Matters

Role separation helps reduce:

- context pollution
- permission confusion
- self-review blind spots
- accidental overreach by a single agent loop

## Why We Are Not Freezing A Full State Machine Yet

Research suggests that large orchestration systems benefit from explicit states.
However, freezing a detailed workflow too early would create false precision.

For now, the public architecture only commits to:

- isolated attempts
- a main controller
- deterministic validation
- explicit compatibility tiers

## Where More Ambitious Ideas Live

Ideas such as:

- branch injection
- stage-level scoring
- event buses
- heterogeneous model routing

belong to the future research track until validated.

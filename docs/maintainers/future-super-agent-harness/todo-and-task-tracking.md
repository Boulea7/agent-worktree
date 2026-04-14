# Todo And Task Tracking

Maintainer planning only. This document is a current planning hypothesis for a future branch. It does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should include a lightweight todo and task-tracking capability, but it should be introduced as a control-plane feature for agent coordination rather than as a generic user-facing todo app.
The current `main` branch already has a narrower internal coordination-task substrate; the future branch work here should build above that seed rather than describing `main` as if no internal coordination objects exist.

## Why It Belongs In The Future Branch

Todo and task tracking become meaningfully useful only once the harness supports richer coordination patterns such as:

- hierarchical delegation
- peer collaboration
- review and promotion loops
- longer-running multi-step execution

The current `main` branch does not need a public todo contract yet because its public surface remains intentionally narrow.

## Intended Role

The future branch should treat todo tracking as a coordination primitive that helps:

- a lead attempt break work into bounded steps
- delegated attempts report progress and blockers
- peer collaborators claim, review, or hand off work
- review and promotion flows keep explicit task-level context

## Proposed Scope

### Internal First

The first version should be internal to the future branch control plane.

It should support at least:

- task identity
- short task description
- status
- owner or responsible attempt
- blocker or dependency references
- last update timestamp

### Suggested Minimal Status Vocabulary

- `pending`
- `in_progress`
- `blocked`
- `completed`
- `dropped`

### Suggested Ownership Model

Todo items should be able to point to:

- a parent coordinating attempt
- a delegated child attempt
- a peer review or verifier attempt

This keeps task tracking useful in both topologies without forcing one runtime model.

## Boundaries

Todo tracking in the future branch should not:

- replace manifest-backed audit truth
- become the only source of execution status
- become a public `main` CLI contract by default
- turn the harness into a generic productivity app

## Relationship To Other Future Documents

- delegated execution should be able to emit task-level progress
- peer collaboration should be able to use shared task references for review and handoff
- memory/state layering should keep task tracking separate from long-term memory

## Chosen Default

If implemented, todo tracking should start as an internal coordination layer in the future branch and only later be considered for broader control-surface exposure.

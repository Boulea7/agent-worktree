# Automation Readiness

This document explains how to keep future implementation work friendly to highly autonomous coding sessions.

## Goal

Make it possible for a future Codex or other coding agent session to implement features with minimal ambiguity and minimal manual steering.

## Requirements For A Good Automation Task

A task should be:

- small enough to finish in one focused pass
- mapped to one development phase
- grounded in an existing public document
- paired with explicit acceptance criteria
- paired with explicit test requirements

## Task Template

Each future implementation task should specify:

- phase
- problem statement
- affected public contract or internal-only area
- expected files or subsystems
- acceptance criteria
- required unit tests
- required integration tests
- documentation impact

## Good Acceptance Criteria

Good acceptance criteria are:

- observable
- deterministic
- scoped

Examples:

- config loader rejects unknown top-level keys outside `extensions`
- attempt manifest includes required fields after creation
- adapter parser normalizes one sample headless result into the canonical event format

## Test Requirement Style

Every task should answer:

- what unit tests must be added
- what regression tests must be updated
- whether contract tests are needed
- whether tool smoke tests are affected

## Definition Of Done

A task is only done when:

- implementation matches the intended scope
- required tests pass
- public docs are updated if needed
- no ignored local files leaked into tracked content
- handoff status is updated if the task changes future sequencing

## Anti-Patterns

Avoid giving future coding sessions vague tasks like:

- “implement the runtime”
- “add multi-agent support”
- “make OpenClaw work”

Prefer:

- “implement manifest parser and validator”
- “add attempt create command with safe branch naming”
- “normalize Codex headless JSONL events into canonical event objects”

## Relationship To `PROJECT_STATUS.local.md`

Use `PROJECT_STATUS.local.md` for short-lived operational continuity.
Use this file for durable task hygiene rules that should remain true across future sessions.

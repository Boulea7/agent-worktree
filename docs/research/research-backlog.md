# Research Backlog

This file tracks high-value research questions that should be revisited before or during early implementation.

## Near-Term Questions

- Which nearby open-source project is the best comparator for v1 scope:
  - helper tool
  - control plane
  - dashboard
  - full agent platform
- What is the smallest compatibility contract that still works across Tier 1 tools?
- Which project-level config fields are worth standardizing early, and which should stay tool-specific?
- What is the smallest runtime manifest that preserves auditability without overfitting implementation details?

## Medium-Term Questions

- When should a task stay on the minimal path versus entering parallel attempt mode?
- How should verification results be summarized for selection and handoff?
- Which runtime events deserve explicit public visibility?
- Which OpenClaw concepts are worth mapping into experimental adapters?

## Longer-Term Questions

- Is stage-level best-result reuse practical enough to prototype?
- Can semantic synthesis across attempts be made safe with deterministic validation?
- When does heterogeneous multi-model routing become useful rather than noisy?
- What trace schema, if any, should become public later?

## Promotion Rule

A research idea should not move from this backlog into public contract language unless:

- the concept is clearly defined
- it has enough evidence to justify implementation work
- the repository can explain it simply without false precision

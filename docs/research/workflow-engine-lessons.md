# Workflow Engine Lessons

This document looks outside the coding-agent niche and borrows from mature workflow and controller systems.

The goal is not to turn `agent-worktree` into Temporal, Argo, Airflow, or Kubernetes. The goal is to learn what those systems already solved well:

- long-running orchestration
- retries and replay
- state transitions
- versioning
- recovery after interruption

## Executive Summary

The most useful lesson from mature workflow engines is simple:

> durable orchestration works best when state is explicit, replay boundaries are deliberate, and public state stays smaller than internal execution detail.

For `agent-worktree`, that supports a future design that is:

- verification-first
- manifest-driven
- replay-aware
- careful about public versus internal state

Confidence: `High`.

## Strong Ideas To Borrow

## 1. Durable State Should Be Explicit

Mature workflow engines do not rely on one in-memory process as the system of record.

The reusable lesson is:

- keep durable state in an inspectable form
- let sessions resume from explicit state, not implicit memory

Why this matters for `agent-worktree`:

- attempt history should outlive one terminal tab
- resuming an attempt should not require perfect conversational continuity
- handoff and later automation both benefit from durable manifests

Documentation implication:

- keep runtime-manifest thinking central
- resist the temptation to make “resume” mean “restore everything magically”

Confidence: `High`.

## 2. Replay Boundaries Matter More Than Raw Snapshots

Workflow engines tend to work best when they replay from explicit boundaries such as completed tasks, waits, or deterministic checkpoints.

Reusable lesson:

- logical progress markers are usually safer than trying to snapshot entire process memory

Why this matters for `agent-worktree`:

- attempt checkpoints should likely be workflow-level artifacts
- future branch reuse should be attached to explicit, replay-safe boundaries

Documentation implication:

- describe checkpoints as logical progress points
- keep whole-process restore semantics out of public specs

Confidence: `High`.

## 3. Public State Should Stay Coarse

Controller-style systems often expose:

- desired state
- observed state
- conditions

rather than a sprawling public phase machine.

Reusable lesson:

- keep the public state model compact and additive

Why this matters for `agent-worktree`:

- future manifests should not leak every scheduler detail
- additive conditions are safer than endless enum expansion

Documentation implication:

- runtime-manifest public states should remain coarse
- event transport and internal scheduling can stay private longer

Confidence: `High`.

## 4. Workflow Versioning Is A Real Requirement

Durable workflow systems often need version-aware resume semantics.

Reusable lesson:

- long-running attempts should not silently cross incompatible orchestration logic

Why this matters for `agent-worktree`:

- checkpoints and resumes may need adapter or workflow version markers later

Documentation implication:

- keep this as a planned direction, not a hard v1 requirement

Confidence: `Medium`.

## 5. Recovery Logic Should Be Designed, Not Implied

Mature workflow systems plan for:

- retries
- partial completion
- re-entry
- interrupted runs

Reusable lesson:

- failure and recovery are first-class design problems, not cleanup details

Why this matters for `agent-worktree`:

- attempts will fail in messy ways
- the product should eventually distinguish retryable, blocked, and terminal states

Documentation implication:

- mention recovery clearly in future research and architecture docs
- do not overspecify internal recovery machinery yet

Confidence: `High`.

## What To Avoid Importing

- DAG-centric complexity that is too heavy for a repo-scoped v1
- data-pipeline assumptions that do not map to coding-agent work
- public workflow DSLs before the core attempt model is stable
- overpromising deterministic replay across non-deterministic external tools

## What To Write Publicly Now

Safe to write now:

- durable manifests matter
- checkpoints should be logical, not magical
- public state should stay compact
- recovery is an intentional design concern

Not safe to write as spec yet:

- detailed workflow graph semantics
- explicit replay contract
- workflow-program language
- exact checkpoint payloads

## Selected Sources

- [Temporal durable execution overview](https://temporal.io/blog/what-is-durable-execution)
- [Temporal durable digest, AI agents](https://temporal.io/blog/durable-digest-september-2025)
- [Azure Durable Functions orchestrations](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-orchestrations)
- [Azure Durable Functions versioning](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-orchestration-versioning)
- [Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes API conventions](https://raw.githubusercontent.com/kubernetes/community/master/contributors/devel/sig-architecture/api-conventions.md)

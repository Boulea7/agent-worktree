# Promotion Gates

This document studies CI, review, and release-engineering systems for lessons on how `agent-worktree` should promote one attempt over another.

The key question is:

> what should make an attempt eligible for selection, merge, or escalation?

## Executive Summary

The strongest lesson from mature branch-protection and merge systems is that promotion should be gated by explicit, deterministic policy:

- required checks
- review requirements
- queue discipline
- auditability

For `agent-worktree`, that means branch promotion should eventually behave more like a validator-driven release gate than like a popularity contest among model outputs.

Confidence: `High`.

## Strong Ideas To Borrow

## 1. Required Checks Before Promotion

Protected branch and merge-queue systems make required checks explicit.

Reusable lesson:

- a candidate should only be promotable after explicit checks pass

Why this matters:

- it maps cleanly to verification-first orchestration
- it gives future attempt manifests and selectors a principled structure

Documentation implication:

- future verification state should clearly separate required from optional checks

Confidence: `High`.

## 2. Queue Discipline Matters

Merge queues and merge trains exist because validating branches in isolation is often not enough.

Reusable lesson:

- promotion order is part of system quality, not an afterthought

Why this matters:

- if `agent-worktree` later supports multiple candidate merges or chained work, queue or sequencing semantics may matter

Documentation implication:

- keep queue-aware promotion as a future architecture concern
- do not force it into v1 unless actual workflows demand it

Confidence: `Medium-High`.

## 3. Review Gates Are Separate From Build Gates

Mature systems distinguish between:

- mechanical validation
- human or policy review

Reusable lesson:

- not every selection decision should collapse into one score

Why this matters:

- `agent-worktree` may eventually need both deterministic checks and explicit review outcomes

Documentation implication:

- future manifests may need separate surfaces for verification and review conditions

Confidence: `High`.

## 4. Auditability Should Be Built In Early

Promotion systems gain trust because they leave a trail:

- which checks ran
- what passed
- what blocked promotion
- what got merged and when

Reusable lesson:

- branch promotion should be explainable from artifacts, not folklore

Why this matters:

- later automation can be powerful without being opaque

Documentation implication:

- artifact summaries and promotion history are worth preserving as future concepts

Confidence: `High`.

## 5. Rollback And Rejection Are Part Of Promotion

Release and merge systems are not only about success. They also define when something must not be promoted.

Reusable lesson:

- selection logic must be able to reject, defer, or escalate

Why this matters:

- “no branch is good enough yet” should be a normal system outcome

Documentation implication:

- avoid language that assumes every task ends with a single automatic winner

Confidence: `High`.

## What To Avoid Importing

- enterprise-heavy policy surfaces before the product has a stable core
- reproducing every SCM platform feature
- turning human review into a mandatory bottleneck for all tasks
- over-specifying promotion workflows before actual implementation exists

## What To Write Publicly Now

Safe to write now:

- deterministic validation should gate promotion
- promotion decisions should be auditable
- review and verification are related but not identical

Not safe to write as public contract yet:

- exact gate language
- exact reviewer or approver semantics
- queue and batching semantics
- rollback automation details

## Selected Sources

- [GitHub protected branches](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub branch protection management](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [GitLab protected branches](https://docs.gitlab.com/user/project/repository/branches/protected/)
- [GitLab merge trains](https://docs.gitlab.com/ci/pipelines/merge_trains/)
- [Azure DevOps branch policies](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops)

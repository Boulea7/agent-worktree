# Future Research Tracks

This document records promising ideas that may become differentiators later, but are not ready to become public contracts today.

These should be documented carefully so the repository benefits from them without becoming trapped by premature specificity.

## Executive Summary

There are several ideas worth preserving because they could make `agent-worktree` much stronger over time:

- reusing the best intermediate stage result rather than only the final winner
- content-addressed checkpoint and branch semantics
- semantic merge or synthesis of outputs across attempts
- process or path supervision
- heterogeneous multi-model collaboration
- gateway or YAML-driven orchestration patterns inspired by broader agent platforms
- trace-first promotion and debugging loops

They are exciting, but they are not yet stable enough for the public spec layer.

The safest public posture is:

- keep them in `Research` or `Experimental` docs
- explain why they matter
- explain why they are not spec-ready
- avoid turning them into public config, CLI, or runtime-manifest promises until at least two independent implementations converge on semantics

Confidence: `Medium-High`.

## 1. Stage-Level Best-Result Reuse

Idea:

- a final winning attempt may not be the best at every stage
- some branch may produce the best architecture, another the best test plan, another the cleanest fix

Why it is promising:

- closer to how good human teams actually work
- could reduce wasted exploration
- aligns with your original vision strongly

Why it is not spec-ready:

- requires a stable definition of stages
- requires scoring or comparison rules that do not yet exist
- may become brittle if implemented before the repository has a stable attempt model

Safe documentation posture:

- describe it as a future research direction
- do not define stage schemas, scoring formulas, or merge rules yet
- keep only soft vocabulary such as `stage`, `checkpoint`, `reuse`, and `promotion`

Confidence: `Medium`.

## 2. Checkpoint, Branch, and Inject Primitives

Idea:

- represent attempts and their evolution with explicit checkpoint and branch semantics
- allow selective reuse of context or artifacts from prior branches

Why it is promising:

- enables richer recovery
- enables partial reuse without rerunning everything
- aligns well with worktree-native thinking

Why it is not spec-ready:

- the difference between conversational context, filesystem state, and runtime state is still not frozen
- naive checkpoint semantics can over-promise implementation guarantees

Safe documentation posture:

- keep the vocabulary in research docs
- avoid freezing data structures in public specs
- do not promise replay guarantees, storage layout, or deterministic restoration semantics yet

Confidence: `Medium-High`.

## 3. Semantic Merge or Synthesis Across Attempts

Idea:

- instead of selecting one winner, synthesize the best parts of multiple attempts

Possible forms:

- merge selected files
- merge test coverage from one branch with implementation from another
- use a verifier or reviewer to propose a synthesis branch

Why it is promising:

- could exceed “best single branch” outcomes
- fits the original vision of combining phase-level best work

Why it is not spec-ready:

- semantic merge is error-prone
- synthesis without strong validation could create fragile hybrids
- conflict resolution logic would become public architecture too early

Safe documentation posture:

- classify as experimental future work
- keep implementation details out of specs until actual prototypes exist

Confidence: `Medium-Low`.

## 4. Process Supervision and Path-Level Policy

Idea:

- judge not only the final result, but also whether the action path itself was healthy, compliant, or promising

Why it is promising:

- better matches the intuition behind stage-aware orchestration
- could improve retry logic, escalation, and branch pruning
- can help keep verification from becoming purely post-hoc

Why it is not spec-ready:

- policy languages and rule extraction are still unsettled
- judge quality and calibration remain fragile
- early false positives could distort orchestration behavior badly

Safe documentation posture:

- document only abstract concepts such as `supervisor`, `policy hook`, `intervention point`, or `review gate`
- do not define a rule DSL, scoring API, or compliance guarantee

Confidence: `Medium-High`.

## 5. Failure Attribution and Trajectory Debugging

Idea:

- treat failure attribution as a first-class orchestration concern rather than an ad hoc debugging exercise

Why it is promising:

- could turn failed attempts into reusable learning signals
- could support better retry policies, better dashboards, and better postmortems

Why it is not spec-ready:

- attribution quality is still not mature enough to standardize around
- trace schemas, privacy boundaries, and debugging semantics are all still moving

Safe documentation posture:

- keep this as observability-oriented research
- use soft concepts like `trace`, `attribution`, `breakpoint`, and `debug view`
- avoid normative trace schemas or required manifest fields

Confidence: `Medium`.

## 4. Process Supervision and Stage-Aware Scoring

Idea:

- evaluate not only final outputs, but also the quality of intermediate reasoning or development steps

Why it is promising:

- may help the system spot promising branches earlier
- may enable better reuse of intermediate artifacts

Why it is not spec-ready:

- research evidence is still less settled than outcome-based verification for code
- the operational cost is high
- it can create false confidence if treated as hard truth too early

Safe documentation posture:

- keep outcome-based verification as the public default
- describe process supervision as a future experiment, not a current design pillar

Confidence: `Medium-Low`.

## 6. Heterogeneous Multi-Model Collaboration

Idea:

- use different models or runtimes for planning, coding, review, summarization, or verification

Why it is promising:

- fits real-world capability asymmetry
- reduces the need to make one runtime responsible for every role
- aligns naturally with the compatibility-first direction

Why it is not spec-ready:

- provider behavior changes quickly
- stable routing policies are hard to define before implementation
- would tempt the public docs into overpromising benchmark-style outcomes

Safe documentation posture:

- frame as a future capability
- keep current docs centered on tool compatibility and adapter design, not model-routing claims

Confidence: `Medium`.

## 7. Gateway or YAML-Orchestrated Systems

Idea:

- borrow some ideas from larger platforms such as OpenClaw around gateway layers, YAML-driven configuration, and skill orchestration

Why it is promising:

- supports future extensibility
- may help with event-driven orchestration and richer control surfaces

Why it is not spec-ready:

- too much platform complexity too early
- risks pulling the project away from repo-scoped coding workflows

Safe documentation posture:

- preserve it under future architecture or experimental compatibility docs
- do not let it dominate the first public contracts

Confidence: `Medium`.

## 8. Skill-On-Demand and Intent-Scoped Context Loading

Idea:

- dynamically load only the specific instructions, docs, or skills needed for the current task or branch

Why it is promising:

- reduces context bloat
- aligns with the "simple when possible, deeper when needed" philosophy

Why it is not spec-ready:

- requires actual runtime composition behavior to exist first
- easy to overspecify before knowing what the real bottlenecks are

Safe documentation posture:

- keep this as a future optimization theme
- do not create public guarantees about context loading behavior yet

Confidence: `Medium`.

## 9. Trace-First Promotion Gates

Idea:

- treat orchestration improvement more like release engineering than unconstrained search
- promote candidate patterns or flows only when they pass non-regression checks and leave auditable traces

Why it is promising:

- fits the project's verification-first DNA
- may help future experimentation stay disciplined

Why it is not spec-ready:

- still early as a pattern
- candidate promotion semantics are not yet shared across tools
- trace formats and gate definitions remain fluid

Safe documentation posture:

- mention `candidate`, `promotion`, `non-regression`, and `trace-first gating` as future terms only
- do not define lifecycle states or artifact formats around them

Confidence: `Medium`.

## Safe Writing Rules For These Tracks

When documenting future research, prefer:

- conceptual language
- explicit uncertainty
- category labels such as `Research`, `Experimental`, or `Deferred`

Avoid:

- numeric performance claims
- fixed algorithms
- hard architectural commitments
- implying that the project already has these capabilities

## Recommended Relationship To Public Specs

These ideas may influence:

- future RFCs
- future ADRs
- future architecture notes

They should not influence:

- current stable config promises
- current runtime manifest requirements
- current CLI guarantees

## Selected Sources

- [LangGraph durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [LangGraph time travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel)
- [OpenClaw gateway protocol](https://docs.openclaw.ai/gateway/protocol)
- [OpenClaw configuration](https://docs.openclaw.ai/gateway/configuration)
- [OpenClaw multiple gateways](https://docs.openclaw.ai/gateway/multiple-gateways)

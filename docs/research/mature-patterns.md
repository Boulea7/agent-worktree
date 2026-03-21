# Mature Patterns

This document captures relatively mature ideas, theories, and engineering patterns that are strong enough to shape the repository's public direction.

These are not speculative moonshots. These are the ideas most likely to survive contact with implementation.

## Executive Summary

The best-supported patterns for `agent-worktree` are not the flashiest ones. They are the boring, high-signal patterns that keep showing up across successful systems and research:

- isolate execution physically
- keep orchestration state explicit
- validate outcomes with deterministic checks
- scale compute adaptively instead of uniformly
- preserve resumability and auditability
- normalize capabilities instead of vendor-specific quirks

Confidence: `High`.

## 1. Verification-First Selection

This is the most mature and defensible core idea for the project.

For coding tasks, the strongest practical loop is:

1. generate one or more candidate attempts
2. run deterministic checks
3. rank using executable evidence first
4. only then use softer signals such as summaries, confidence, or review commentary

Why it matters:

- code can be built, linted, tested, and diff-reviewed
- deterministic evidence is much safer than trusting self-reported confidence
- this works for both simple and complex tasks

Repository implication:

- keep this idea visible in `README.md`
- reinforce it in `docs/concepts/mental-model.md`
- eventually make verification central to runtime manifests and CLI output

Confidence: `High`.

## 1.5. Merge-Gate Thinking

A very mature adjacent pattern comes from CI, protected branches, merge queues, and auto-merge systems:

- a candidate is not selected because it sounds best
- a candidate is selected because required checks have passed

Repository implication:

- future attempt manifests should make required checks explicit
- future merge or promotion decisions should be tied to deterministic status

Confidence: `High`.

## 2. Adaptive Orchestration

One of the easiest mistakes would be to design the product as if every task deserves the heaviest possible orchestration.

A more mature pattern is:

- simple work: use a minimal, direct path
- medium work: allow isolated retries or a small candidate pool
- hard work: allow multiple isolated attempts and richer review

Why it matters:

- reduces operational overhead
- keeps the project useful for everyday work, not only “hero problems”
- avoids turning the product into a complexity tax

Repository implication:

- keep “simple and complex tasks” explicit in the vision docs
- avoid wording that implies parallelism is mandatory
- treat orchestration depth as a policy choice, not a fixed doctrine

Confidence: `High`.

## 3. Durable Workflow State

Systems that run longer or coordinate multiple actors need state that survives beyond a single terminal session.

The mature pattern is not “remember everything in one conversation.” It is:

- explicit manifests
- explicit states
- resumable sessions
- inspectable artifacts

Why it matters:

- makes handoff easier
- improves recovery after interruption
- supports future automation and tooling

Repository implication:

- the public runtime manifest should stay minimal but real
- the local handoff document is already a small example of this philosophy
- future implementations should prefer stateful manifests over transcript archaeology

Confidence: `High`.

## 3.5. Controller-Style State Reporting

Another mature idea worth borrowing is the controller pattern from systems like Kubernetes:

- desired state
- observed state
- additive conditions

Why it matters:

- keeps public state small and extensible
- avoids forcing the project into an oversized public phase machine

Repository implication:

- future manifests should likely expose small statuses plus additive conditions
- event transport can stay internal longer than state semantics

Confidence: `High`.

## 4. Capability-First Compatibility

Different coding-agent tools overlap enough to be useful together, but not enough to be treated as if they share one native contract.

The mature pattern is:

- define your own capability vocabulary
- map each tool into it
- document gaps explicitly

Useful normalized concepts:

- execution mode
- machine-readable output
- session resume
- safety intent
- MCP support
- lifecycle hooks or plugin events
- canonical project guidance

Why it matters:

- keeps the product future-proof
- prevents one runtime from silently owning the architecture
- makes support tiers tractable

Confidence: `High`.

## 4.5. Idempotent Control Operations

Mature systems with retries and reconnects do not assume commands run exactly once.

Useful principle:

- control operations should be idempotent when given the same operation identity

Why it matters:

- safer retries
- fewer duplicate side effects
- better future event-driven workflows

Repository implication:

- future `attempt create`, `checkpoint`, `merge`, and cleanup flows should be designed with idempotency in mind

Confidence: `High`.

## 5. Public Contract, Private Workflow

Another mature pattern is to distinguish between:

- what the repository promises publicly
- what maintainers do locally to stay productive

Why it matters:

- prevents public docs from becoming polluted by personal setup
- preserves privacy and machine-specific flexibility
- still allows excellent handoff hygiene

Repository implication:

- keep `AGENTS.md` minimal and shared
- keep `PROJECT_STATUS.local.md` local
- keep raw research in `/.local/ai/**`

Confidence: `High`.

## 6. Worktree Plus Session Backend As The Practical Isolation Default

At the engineering level, the most mature local-first isolation pattern remains:

- `git worktree` for filesystem isolation
- `tmux` or equivalent for session persistence
- future optional containerization for stronger sandboxing

Why it matters:

- pragmatic
- already widely understood
- strong enough for v1 without over-engineering

Repository implication:

- continue documenting worktree-native thinking as the core model
- keep stronger isolation as a future extension track, not a day-one dependency

Confidence: `High`.

## 6.5. Versioned Long-Running Attempts

Durable systems often pin long-running instances to versioned logic rather than silently changing behavior under them.

Why it matters:

- safer resume semantics
- clearer checkpoint compatibility

Repository implication:

- a future attempt or checkpoint should probably carry an adapter or workflow version

Confidence: `Medium`.

## 7. Event-Oriented Thinking, But Not Yet a Hard Event Bus

A mature middle-ground pattern is to think in events internally without prematurely exposing a formal distributed event bus.

Useful internal event concepts:

- attempt created
- runtime started
- verification finished
- attempt stalled
- merge approved
- cleanup completed

Why it matters:

- helps later extensibility
- keeps orchestration observable
- does not force the repository into an overbuilt platform too early

Repository implication:

- safe to describe as a future architecture direction
- not yet safe to freeze as a public wire protocol

Confidence: `Medium-High`.

## 8. Passive-First, Active-On-Uncertainty

One of the healthiest mature control ideas is to start small and escalate only when uncertainty, complexity, or risk justifies extra orchestration.

Why it matters:

- fits the project's quality-for-simple-and-complex-work direction
- prevents orchestration from becoming a default tax

Repository implication:

- preserve a minimal path for simple tasks
- widen search or orchestration depth only when needed

Confidence: `Medium`.

## 9. Bounded Hedging, Not Default Fan-Out

Parallelism can reduce tail risk, but unbounded fan-out is usually wasteful and hard to control.

Useful principle:

- cap parallel attempts
- cancel losers
- widen only when justified

Repository implication:

- future orchestration docs should favor bounded exploration rather than “more branches is always better”

Confidence: `Medium`.

## What To Write Into Public Docs Now

These are mature enough to be part of the public narrative:

- verification-first
- adaptive orchestration
- worktree-native isolation
- capability-first compatibility
- durable manifests
- public/private doc boundaries

## What To Keep Out Of Public Specs For Now

- exact workflow algorithms
- exact state machine internals
- fixed orchestration depth logic
- detailed event schemas
- performance promises

## Recommended Documentation Landing Points

- `README.md`
  - emphasize adaptive quality modes and verification-first
- `docs/concepts/mental-model.md`
  - explain why simple tasks and complex tasks should both be served
- `docs/specs/runtime-manifest.md`
  - keep durability minimal but explicit
- `docs/compat/tooling-matrix.md`
  - keep capability thinking central
- `docs/architecture/orchestrator-model.md`
  - explain role separation and orchestration without overspecifying internals

## Selected Sources

- [OpenAI Codex worktrees docs](https://developers.openai.com/codex/app/worktrees/)
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [OpenHands runtime architecture](https://docs.openhands.dev/openhands/usage/architecture/runtime)
- [OpenHands workspace architecture](https://docs.openhands.dev/sdk/arch/workspace)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes API conventions](https://raw.githubusercontent.com/kubernetes/community/master/contributors/devel/sig-architecture/api-conventions.md)
- [Temporal durable execution overview](https://temporal.io/blog/what-is-durable-execution)

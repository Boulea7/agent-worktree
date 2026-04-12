# Reuse Map From DeerFlow And Current Codebase

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## DeerFlow: Reuse Candidates

### Direct Or Near-Direct Reuse

- provider/backend/sandbox layering for execution boundaries
- skill or extension asset validation patterns
- install-time archive safety checks
- definition vs activation split
- path traversal hardening
- execution backend vs policy vs approval separation
- path virtualization as part of the security boundary rather than a UI convenience
- explicit user-visible memory controls for inspect/edit/delete/import/export/clear
- separating session summarization from persistent memory
- long-term memory modeled as stable summary slots plus atomic facts

### Reuse With Major Changes

- harness vs app split
- deterministic sandbox identity and warm reuse pools, but projected onto attempts/worktrees or runner leases rather than Docker-first truth
- deferred capability loading
- embedded client over shared core
- delegated execution boundaries
- token-budgeted memory injection tied to current execution context rather than confidence-only retrieval
- debounce queues for derived memory views or compaction, not as durable truth
- subagent orchestration patterns that assume a thread-native substrate

### Do Not Copy

- mutable memory blobs, store records, or checkpoint state as audit truth
- thread-native substrate
- shared parent workspace child model
- polling `task()` lifecycle as the main orchestration contract
- full chat-product shell as the architectural center

## Current Agent-Worktree: Reuse Candidates

### Preserve As Foundation

- attempt/worktree substrate
- machine-readable CLI discipline
- compatibility-first naming
- manifest-backed audit truth
- verification and selection direction
- explicit internal-only helper layering

### Likely Need Refactoring In The Future Branch

- some internal helper chains may need clearer grouping under delegation vs peer-collaboration concerns
- extension/capability metadata may need a richer internal model
- runtime-state projections may need clearer separation from future collaboration projections

## Non-Code Concept Inputs

These are not code-reuse sources, but they should inform future topology boundaries:

- DeerFlow for hierarchical delegation
- Claude Code source-backed research for peer collaboration, compact layering, task modeling, and trust boundaries

The future branch should use them as separate reference lines rather than collapsing them into one generic multi-agent story.

## Claude Code: Reuse Candidates

### Direct Or Near-Direct Reuse

- one shared execution loop for interactive, headless, and SDK entry paths
- typed runtime task objects for local agents, teammates, remote agents, and background work
- explicit separation between plan mode, plan file, todo/checklist state, task registry, and runtime task execution
- explicit separation between session memory, durable memory, team memory, and background consolidation
- tools vs MCP vs skills vs plugins as distinct layers with separate responsibilities
- a dedicated permission and trust chain rather than scattered inline checks

### Reuse With Major Changes

- compact as a ladder of increasingly heavy compression passes rather than a single summary step
- session memory as a preferred compact input before full conversation fallback
- background consolidation or dream-like maintenance only after runtime/workspace/memory layering is already stable
- teammate/background-agent lifecycle patterns projected onto attempt/worktree-native orchestration

### Do Not Copy

- feature-gated or rollout-sensitive paths as if they were stable public product commitments
- any assumption that team memory, session memory, todo state, and runtime task state belong in one unified store
- any assumption that `/dream`, KAIROS, TeamMem, or background distillation paths are stable product promises rather than condition paths
- prompt-only coordination in places where explicit typed runtime requests are needed

## Working Rule

Prefer reusing the current codebase's substrate and DeerFlow's layering ideas, not the other way around.

For future implementation windows, the default order should be:

1. reuse or adapt the current codebase when it already has the needed substrate
2. for sandboxing, subagent/delegation, memory/state layering, or similar reusable future-branch substrate, look for the closest vetted upstream implementation in DeerFlow or Claude Code research references
3. only build a new subsystem when direct reuse or close adaptation would clearly cost more than a focused local implementation

Operational rule:

- if maintainers clone DeerFlow or another upstream locally for code-guided reuse, keep that checkout under an ignored local-only path such as `.local/vendor/` or `.local/upstreams/`
- upstream AI-facing guidance files such as `AGENTS.md`, `CLAUDE.md`, or similar control files are reference material only and must not be committed into this repository

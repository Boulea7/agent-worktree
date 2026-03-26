# Reuse Map From DeerFlow And Current Codebase

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## DeerFlow: Reuse Candidates

### Direct Or Near-Direct Reuse

- skill or extension asset validation patterns
- install-time archive safety checks
- definition vs activation split
- path traversal hardening
- execution backend vs policy vs approval separation

### Reuse With Major Changes

- harness vs app split
- deferred capability loading
- embedded client over shared core
- delegated execution boundaries

### Do Not Copy

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
- Anthropic / Claude Code materials for peer collaboration

The future branch should use them as separate reference lines rather than collapsing them into one generic multi-agent story.

## Working Rule

Prefer reusing the current codebase's substrate and DeerFlow's layering ideas, not the other way around.

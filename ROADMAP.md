# Roadmap

## Now

- Keep build, typecheck, and test gates green on the implemented CLI and worktree baseline
- Harden manifest, path, and runtime execution boundaries without widening the public surface
- Keep public compatibility docs and machine-readable contracts aligned with real behavior
- Continue thin internal helper progression for verification, selection, and handoff composition
- Maintain a clean worktree-first handoff workflow for future sessions

## Next

- Refine cleanup, manifest, and compatibility contracts where docs and implementation still diverge
- Continue bounded internal lifecycle helpers without exposing public spawn, wait, close, or execution commands
- Tighten executable probing and credential-injection trust boundaries for `codex-cli`
- Publish focused RFCs only when a contract is ready to stabilize

## Later

- Broaden internal lifecycle composition above the current bounded helper chain
- Consider additional Tier 1 runtime execution slices once the first execution baseline stays healthy
- Explore richer maintainer workflows and future branch planning beyond the current narrow public CLI

## Research Tracks

- Stage-based evaluation and best-intermediate-result reuse
- Checkpoint and branch semantics for agent attempts
- Event-bus and orchestrator patterns
- Experimental OpenClaw compatibility
- Heterogeneous multi-model collaboration

## Explicitly Deferred

- Production runtime guarantees
- Hosted execution
- Full Tree-of-Thoughts or MCTS search by default
- Custom process reward model training
- Large-scale benchmark claims before a stable prototype exists

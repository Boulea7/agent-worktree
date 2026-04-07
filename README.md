# agent-worktree

<p align="center">
  <strong>A git-native orchestration project for coding agents.</strong><br />
  Parallel when needed, minimal when not, always quality-first.
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.zh-TW.md">繁體中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-experimental-111111">
  <img alt="phase" src="https://img.shields.io/badge/phase-phase4%20compatibility%20baseline-2f6feb">
  <img alt="focus" src="https://img.shields.io/badge/focus-contracts%20%2B%20tests-1f883d">
</p>

## Overview

`agent-worktree` is a git-native orchestration project for running coding agents in isolated worktrees, with future internal verification and selection work layered on top of that foundation.

The repository started as a documentation-first effort and has now entered an early implementation phase centered on contract clarity, tests, and a thin worktree lifecycle slice.

The long-term goal is broader than "heavy parallelism for only the hardest tasks." This project should also support simpler tasks that still demand quality, using less orchestration when less orchestration is enough.

## Design Goals

- `Worktree-native`: isolate candidate runs at the filesystem level
- `Verification-first`: prefer deterministic checks over confident prose
- `Adaptive`: scale from lightweight flows to deeper parallel exploration
- `Tool-friendly`: support multiple coding-agent tools without vendor lock-in
- `Docs-first`: write the public contract before code narrows the design

## Project Scope

| In scope | Out of scope |
| --- | --- |
| Worktree-based orchestration patterns | Hosted coding platform |
| Public specs for config, manifests, and CLI contracts | General-purpose multi-agent framework for every domain |
| Compatibility layers for coding-agent tools | A new coding agent that replaces existing tools |
| Research-backed future directions | Premature benchmark marketing |

## Compatibility Strategy

### Tier 1

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

### Experimental

- OpenClaw
- Other coding-agent CLIs that fit the adapter model

See:

- [Compatibility Overview](docs/compat/overview.md)
- [Tooling Matrix](docs/compat/tooling-matrix.md)

## Current Phase

This repository is currently focused on:

1. Node/TypeScript core scaffolding
2. config and runtime-manifest contracts
3. machine-readable CLI behavior
4. thin worktree lifecycle commands
5. public read-only compatibility diagnostics via `agent-worktree doctor`, `agent-worktree compat probe <tool>`, and `agent-worktree compat smoke <tool>`
6. a bounded internal `codex-cli` execution contract for the first Tier 1 runtime
7. docs and implementation alignment

The repository now has a thin Phase 4 public compatibility baseline. `compat smoke codex-cli` is the first bounded public compatibility smoke signal for a Tier 1 runtime, while `doctor` and `compat probe` keep the remaining Tier 1 runtimes on explicit descriptor-only boundaries until broader execution-backed work exists.

The public baseline is still intentionally narrow. Today it includes `compat list`, `compat show`, `compat probe`, `compat smoke`, `doctor`, and the thin `attempt create` / `attempt list` / `attempt cleanup` lifecycle commands, all centered on machine-readable contracts.

The internal baseline is wider than the public one. `codex-cli` now has a bounded internal execution path around `codex exec --json`, plus ongoing internal continuation work across verification, selection, promotion/handoff composition, runtime-state/control-plane composition, grouped finalization reporting, and bounded-parallelism Phase 6 prep. Those internal buckets remain intentionally non-public. The current bounded-parallelism prep inside that internal continuation now includes internal-only spawn-budget projection, budget-aware spawn-candidate composition, spawn batch planning, spawn batch item projection, a bounded spawn batch apply convenience seam, a bounded spawn batch headless-apply-items projection seam, a bounded spawn batch headless apply convenience seam, and the current headless batch bridge through spawn-headless wait/close target-apply batches, without widening any public surface.

That Phase 4 closeout does not mean full runtime orchestration exists. Other runtimes remain descriptor-only, and `resume`, MCP transport execution, public execution commands, public wait/close/spawn commands, and public manifest-backed execution or session-lifecycle semantics remain intentionally deferred. A bounded internal `session` block may still appear in the runtime manifest, but it remains non-public metadata: public CLI output does not expose it, and it is not attach/resume or lifecycle-control truth. The current public promise is compatibility-only: direct-shell verification and the env-gated Vitest smoke harness may support it locally, but the Vitest harness remains narrower and is not a default validation path.
The current `codex-cli` executable probing policy is intentionally internal: execution helpers may resolve a different `codex` binary than shell `command -v codex` when `PATH` contains shadow binaries, but that is not a public adapter contract. The same is true for internal `--profile` passthrough and relay-compatible env overlays. The bounded parser tolerates obvious non-JSON prelude lines, including bracket-prefixed log noise, while malformed JSON-looking records still fail loudly.
The current manifest contract also includes a thin lineage/source foundation for attempt provenance. Attempts may record `sourceKind` plus an optional `parentAttemptId`, but this remains audit metadata only: `attempt create` emits `sourceKind: "direct"` today, while delegated runtime behavior, public fork/resume lifecycle semantics, and any public session-backed execution contract remain deferred.

## Why This Matters

Most coding-agent workflows today live somewhere between:

- one overloaded context window
- several ad hoc terminal sessions with no durable orchestration model

`agent-worktree` aims to provide a cleaner middle ground:

- use minimal orchestration for simple work
- use isolated parallel attempts for harder work
- keep the controller deterministic where it matters
- stay explicit about what is verified, experimental, or deferred

## Start Here

The committed documentation order starts with [SPEC.md](SPEC.md), then this `README.md`, then [docs/index.md](docs/index.md).
Use [AGENTS.md](AGENTS.md) as the repository-specific execution rules and boundary companion, not as a replacement for the committed spec/doc set.

- [SPEC.md](SPEC.md)
- [README.md](README.md)
- [docs/index.md](docs/index.md)
- [AGENTS.md](AGENTS.md)

## Key References

- [ROADMAP.md](ROADMAP.md)
- [docs/maintainers/development-phases.md](docs/maintainers/development-phases.md)
- [docs/compat/tooling-matrix.md](docs/compat/tooling-matrix.md)
- [docs/research/vision-synthesis.md](docs/research/vision-synthesis.md)

## Documentation Policy

- Public repo content should contain durable, sanitized, shared knowledge.
- Raw research notes, transcripts, local AI state, and session handoff logs stay local and ignored.
- Local handoff files such as `PROJECT_STATUS.local.md` and `CODING_PHASE_PROMPT.local.md` are operational overlays only and must not be committed.

## Near-Term Focus

- Continue hardening the current config, manifest, and CLI contracts
- Keep the public compatibility diagnostics, probe, and smoke slices accurate and machine-readable
- Keep the current create/list/cleanup lifecycle baseline stable without widening public lifecycle surfaces
- Continue hardening the bounded internal `codex-cli` execution contract without expanding it into a full runtime framework
- Keep the `codex-cli` smoke scaffold env-gated and non-default while it remains a bounded compatibility probe
- Keep docs, tests, and implementation boundaries aligned

## License

License selection is intentionally deferred until the public project surface is clearer.

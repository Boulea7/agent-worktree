# Competitor Matrix

This matrix is intentionally coarse. It exists to compare category shape, not to claim exact feature parity.

| Project | Core primitive | Validation posture | Tool stance | UI stance | Best lesson for `agent-worktree` |
| --- | --- | --- | --- | --- | --- |
| `agentree` | Worktree helper | Light | Agent-neutral helper | Minimal CLI | Setup friction matters |
| `workmux` | Worktree + session backend | Medium | Agent-friendly but workflow-opinionated | Terminal-first with dashboard | Lifecycle, setup, cleanup, caveats |
| `workstreams` | Declarative workstream/task | Medium | More orchestration-oriented | Dashboard-friendly | Worktree should belong to a tracked task |
| `Composio agent-orchestrator` | Worktree + PR + CI loop | Stronger | Plugin-based, multi-provider | Operational dashboard / workflow-driven | CI/review feedback loops as first-class signals |
| `parallel-code` | Worktree task manager | Medium | Multi-agent-friendly | Desktop/session manager | Strong task ergonomics |
| `worktree-mcp-manager` | Worktree claim/lease model | Medium-strong | Interface-neutral core | CLI/GUI/MCP split | Claims, heartbeat, conflict prediction |
| `mco` | Agent-neutral orchestration | Strong review/output posture | Broad runtime support | CLI-first | Capability-first adapters and output formats |
| `AWS CLI Agent Orchestrator` | Explicit orchestration verbs | Medium-strong | Multi-provider | CLI-first | `assign`, `handoff`, `send_message` as explicit verbs |
| `grove` | Multi-repo task manager | Medium | Broad agent compatibility | TUI-first | Multi-repo branch coherence |
| `OpenHands` | Full coding-agent platform | Strong eval influence | Platform-first | SDK/CLI/UI/cloud | Surface separation and evaluation harness thinking |
| `mini-swe-agent` | Minimal shell-centric agent | Strong simplicity signal | Narrower | Minimal | Avoid unnecessary scaffolding |
| `OpenClaw` | Gateway + assistant platform | Broad platform controls | Experimental for coding orchestration | App/platform-rich | Gateway and extensibility ideas, not v1 template |

## Gap In The Landscape

No nearby project clearly owns all three of these at once:

- worktree-native scheduling
- agent-neutral orchestration
- deterministic validation-based selection

That gap is the clearest product opportunity for `agent-worktree`.

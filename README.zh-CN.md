# agent-worktree

默认语言：简体中文 | [English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

`agent-worktree` 是一个以文档和规格先行为起点、现已进入早期实现阶段的开源项目，目标是把编码代理的高质量工作流沉淀成一个 `git worktree` 原生的编排层。

## 项目定位

它不是要替代 `Claude Code`、`Codex CLI`、`Gemini CLI` 或 `OpenCode`，而是为这些工具以及其他同类 CLI 提供一套更清晰的：

- 隔离执行方式
- 质量验证方式
- 结果选择方式
- 会话交接方式

## 设计原则

- `Worktree-native`：把隔离工作树作为核心调度原语
- `Verification-first`：优先相信可执行验证，而不是模型自信
- `Adaptive`：简单任务尽量轻量，复杂任务再提升并行和评估强度
- `Tool-friendly`：优先兼容多种热门编码代理工具
- `Docs-first`：先把公开契约写清，再开始代码实现

## 一等支持目标

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

实验兼容目标：

- OpenClaw
- 其他可适配的编码代理 CLI

## 当前阶段

当前仓库已进入“早期实现”阶段，当前重点包括：

- Node/TypeScript 核心脚手架
- config 与 runtime manifest 契约
- 机器可读 CLI 行为
- 极薄的 worktree lifecycle 切片
- 只读的兼容性诊断命令 `doctor`、`compat probe <tool>` 与 `compat smoke <tool>`

当前仓库已经形成一个极薄的 Phase 4 public compatibility baseline：`compat smoke codex-cli` 提供了第一个 Tier 1 runtime 的有界、公开、端到端兼容性检查点，而 `doctor` 与 `compat probe` 让其余 Tier 1 runtime 继续停留在明确的 descriptor-only 边界内。

当前公开基线仍然很窄：`doctor`、`compat list/show/probe/smoke`、以及 `attempt create/list/cleanup` 是主要 public surface。
这个 P4 收口只代表兼容性承诺，不代表 general execution 或 lifecycle 承诺。更深的 `codex-cli` execution，以及当前 internal-only 的 verification、selection、promotion/handoff composition、runtime-state/control-plane composition、grouped finalization reporting 与 bounded-parallelism Phase 6 prep 仍属于内部实现，不应解读为公开生命周期能力；这条内部链路目前已经推进到 `spawn-budget`、budget-aware `spawn-candidate`、spawn batch planning、spawn batch item projection、bounded spawn batch apply convenience seam、bounded spawn batch headless-apply-items projection seam、bounded spawn batch headless-apply convenience seam、headless wait/close request projection seams，以及当前通过 `spawn-headless wait/close target-apply batches` 收口的 headless batch bridge。
其他 runtime 仍然保持 descriptor-only。`resume`、MCP transport execution、public execution 命令、public wait/close/spawn 命令，以及 public manifest-backed execution 或 session-lifecycle 语义仍然延后；env-gated Vitest smoke harness 仍是更窄的兼容性检查，不是默认验证路径。即便 runtime manifest 中出现内部 `session` block，它也仍然只是非公开元数据，不是 attach/resume 或生命周期控制真相。`codex-cli` 的 executable probing、`--profile` 透传、relay-compatible env overlay 也都保持 internal-only；`sourceKind` 与可选的 `parentAttemptId` 仍然只是审计元数据，不代表公开的 delegated runtime 或 session lifecycle 语义。
更复杂的 runtime adapter、verification ranking 和高级编排能力仍然延后。

## Start Here

已提交文档的规范入口顺序是：[SPEC.md](SPEC.md) -> [README.md](README.md) -> [docs/index.md](docs/index.md)。
[AGENTS.md](AGENTS.md) 用作仓库级执行规则与边界补充，不替代已提交的 spec/doc 文档集。

- [SPEC.md](SPEC.md)
- [README.md](README.md)
- [docs/index.md](docs/index.md)
- [AGENTS.md](AGENTS.md)
- [ROADMAP.md](ROADMAP.md)

## Key References

- [docs/compat/overview.md](docs/compat/overview.md)
- [ROADMAP.md](ROADMAP.md)
- [docs/maintainers/development-phases.md](docs/maintainers/development-phases.md)
- [docs/compat/tooling-matrix.md](docs/compat/tooling-matrix.md)
- [docs/research/vision-synthesis.md](docs/research/vision-synthesis.md)

## 公共与私有文档

公共仓库只保留：

- 脱敏后的共享规则
- 兼容文档
- 规格文档
- RFC / ADR / 路线图

本地忽略内容保留：

- 原始调研
- 会话转录
- 机器相关配置
- 当前窗口交接记录

当前显眼但不入 Git 的交接文件是：

- `PROJECT_STATUS.local.md`
- `CODING_PHASE_PROMPT.local.md`

这些 `*.local.md` 文件只作为 operational overlay 使用，不能覆盖已提交文档中的 canonical truth。

## 长期方向

项目最终希望既能服务复杂的高价值代码任务，也能服务较简单但仍然追求质量的任务。

换句话说，未来它不应该只有“重型并行搜索”一种模式，而应该支持：

- 轻量单路高质量模式
- 多路隔离探索模式
- 更复杂的阶段性评估与结果融合模式

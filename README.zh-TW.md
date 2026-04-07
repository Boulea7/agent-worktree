# agent-worktree

預設語言：繁體中文 | [English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

`agent-worktree` 是一個以文件與規格先行為起點、現已進入早期實作階段的開源專案，目標是把編碼代理的高品質工作流沉澱成一個 `git worktree` 原生的編排層。

## 專案定位

它不是要取代 `Claude Code`、`Codex CLI`、`Gemini CLI` 或 `OpenCode`，而是為這些工具以及其他同類 CLI 提供一套更清晰的：

- 隔離執行方式
- 品質驗證方式
- 結果選擇方式
- 會話交接方式

## 設計原則

- `Worktree-native`
- `Verification-first`
- `Adaptive`
- `Tool-friendly`
- `Docs-first`

## 一等支持目標

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

實驗相容目標：

- OpenClaw
- 其他可適配的編碼代理 CLI

## 當前階段

目前倉庫已進入「早期實作」階段，當前重點包括：

- Node/TypeScript 核心腳手架
- config 與 runtime manifest 契約
- 機器可讀 CLI 行為
- 極薄的 worktree lifecycle 切片
- 唯讀的相容性診斷命令 `doctor`、`compat probe <tool>` 與 `compat smoke <tool>`

目前倉庫已形成一個極薄的 Phase 4 public compatibility baseline：`compat smoke codex-cli` 提供了第一個 Tier 1 runtime 的有界、公開、端到端相容性證明，而 `doctor` 與 `compat probe` 讓其餘 Tier 1 runtime 繼續停留在明確的 descriptor-only 邊界內。

目前公開基線仍然很窄：`doctor`、`compat list/show/probe/smoke`，以及 `attempt create/list/cleanup` 是主要 public surface。
這個 P4 收口只代表相容性承諾，不代表 general execution 或 lifecycle 承諾。更深的 `codex-cli` execution、profile/env 傳遞、runtime-state，以及目前 internal-only 的 bounded-parallelism Phase 6 prep 仍屬於內部實作，不應解讀為公開 lifecycle 能力；這條內部鏈路目前已經推進到 `spawn-budget`、budget-aware `spawn-candidate`、spawn batch planning、spawn batch item projection、bounded spawn batch apply convenience seam、bounded spawn batch headless-apply-items projection seam、bounded spawn batch headless apply convenience seam，以及目前透過 `spawn-headless wait/close target-apply batches` 收口的 headless batch bridge。
更複雜的 runtime adapter、verification ranking 與高階編排能力仍然延後。

## 參照順序

已提交文件的規範入口順序是：[SPEC.md](SPEC.md) -> [README.md](README.md) -> [docs/index.md](docs/index.md)。
[AGENTS.md](AGENTS.md) 用作倉庫級執行規則與邊界補充，不取代已提交的 spec/doc 文件集。

- [SPEC.md](SPEC.md)
- [README.md](README.md)
- [docs/index.md](docs/index.md)
- [AGENTS.md](AGENTS.md)

## 補充參考

- [docs/compat/tooling-matrix.md](docs/compat/tooling-matrix.md)
- [docs/maintainers/development-phases.md](docs/maintainers/development-phases.md)
- [docs/research/vision-synthesis.md](docs/research/vision-synthesis.md)

## 公開與私有文件

公開倉庫只保留：

- 去敏後的共享規則
- 相容文件
- 規格文件
- RFC / ADR / 路線圖

本地忽略內容保留：

- 原始研究
- 會話轉錄
- 機器相關設定
- 當前視窗交接記錄

目前顯眼但不入 Git 的交接檔案是：

- `PROJECT_STATUS.local.md`

## 長期方向

未來專案應同時支援：

- 輕量單路高品質模式
- 多路隔離探索模式
- 更進階的分階段評估與成果融合模式

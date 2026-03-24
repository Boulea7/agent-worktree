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

目前公開基線仍然很窄：`doctor`、`compat list/show/probe/smoke`，以及 `attempt create/list/cleanup` 是主要 public surface。
更深的 `codex-cli` execution、profile/env 傳遞、runtime-state、spawn/wait/close helper chain 目前仍屬於 internal-only 實作，不應解讀為公開 lifecycle 能力。
更複雜的 runtime adapter、verification ranking 與高階編排能力仍然延後。

## 重要文件

- [README.md](README.md)
- [SPEC.md](SPEC.md)
- [AGENTS.md](AGENTS.md)
- [docs/index.md](docs/index.md)
- [docs/compat/tooling-matrix.md](docs/compat/tooling-matrix.md)
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

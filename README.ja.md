# agent-worktree

既定言語: 日本語 | [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

`agent-worktree` は、コーディングエージェントの高品質な実行フローを `git worktree` ネイティブなオーケストレーション層として整理するための、ドキュメント先行から始まり、現在は初期実装段階に入った OSS プロジェクトです。

## このプロジェクトの役割

このプロジェクトは `Claude Code`、`Codex CLI`、`Gemini CLI`、`OpenCode` を置き換えるものではありません。代わりに、それらのツールや他の CLI エージェントに対して、次のような共通基盤を与えることを目指します。

- 分離された実行
- 検証中心の品質管理
- 結果選択と比較
- セッション引き継ぎ

## 設計原則

- `Worktree-native`
- `Verification-first`
- `Adaptive`
- `Tool-friendly`
- `Docs-first`

## Tier 1 対象

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

実験対象:

- OpenClaw
- 汎用アダプタで扱えるその他の CLI

## 現在の段階

現在のリポジトリは初期実装フェーズに入っており、主な重点は次のとおりです。

- Node/TypeScript のコアスキャフォールド
- config と runtime manifest の契約
- 機械可読な CLI 振る舞い
- ごく薄い worktree lifecycle スライス
- 読み取り専用の互換性診断コマンド `doctor`、`compat probe <tool>`、`compat smoke <tool>`

現在のリポジトリには、ごく薄い Phase 4 public compatibility baseline があります。`compat smoke codex-cli` は Tier 1 runtime に対する最初の bounded で public な互換性チェックポイントであり、`doctor` と `compat probe` は他の Tier 1 runtime を明示的な descriptor-only 境界に留めています。

現在の公開ベースラインはまだ狭く、主な public surface は `doctor`、`compat list/show/probe/smoke`、`attempt create/list/cleanup` に限られます。
この P4 closeout は compatibility promise だけを意味し、general execution や lifecycle promise を意味しません。より深い `codex-cli` execution、そして current internal-only の verification、selection、promotion/handoff composition、runtime-state/control-plane composition、grouped finalization reporting、bounded-parallelism Phase 6 prep は今も internal-only 実装であり、公開 lifecycle 機能として解釈すべきではありません。この内部チェーンは現在、`spawn-budget`、budget-aware `spawn-candidate`、spawn batch planning、spawn batch item projection、bounded spawn batch apply convenience seam、bounded spawn batch headless-apply-items projection seam、bounded spawn batch headless-apply convenience seam、headless wait/close request projection seams、そして `spawn-headless wait/close target-apply batches` までつながる current headless batch bridge まで進んでいます。
他の runtime は引き続き descriptor-only です。`resume`、MCP transport execution、public execution commands、public wait/close/spawn commands、そして public manifest-backed execution または session-lifecycle semantics はまだ deferred のままで、env-gated Vitest smoke harness もより狭い互換性チェックであり、既定の検証経路ではありません。runtime manifest に内部 `session` block が現れても、それは依然として非公開メタデータであり、attach/resume や lifecycle control truth ではありません。`codex-cli` の executable probing、`--profile` の受け渡し、relay-compatible env overlay も internal-only のままであり、`sourceKind` と任意の `parentAttemptId` も監査用メタデータに留まり、公開 delegated runtime や session lifecycle の意味を持ちません。
より高度な runtime adapter、verification ranking、複雑なオーケストレーション機能はまだ先送りです。

## 参照順序

コミット済みドキュメントの規範的な入口順は [SPEC.md](SPEC.md) -> [README.md](README.md) -> [docs/index.md](docs/index.md) です。
[AGENTS.md](AGENTS.md) はリポジトリ固有の実行ルールと境界補助であり、コミット済み spec/doc セットの代替ではありません。

- [SPEC.md](SPEC.md)
- [README.md](README.md)
- [docs/index.md](docs/index.md)
- [AGENTS.md](AGENTS.md)

## 補足参照

- [docs/compat/tooling-matrix.md](docs/compat/tooling-matrix.md)
- [docs/maintainers/development-phases.md](docs/maintainers/development-phases.md)
- [docs/research/vision-synthesis.md](docs/research/vision-synthesis.md)

## 公開文書とローカル文書

公開リポジトリには以下のみを置きます。

- 共有可能で秘匿情報を含まないルール
- 互換性ドキュメント
- 仕様書
- RFC / ADR / ロードマップ

ローカル限定で保持するもの:

- 生の調査メモ
- 会話ログ
- マシン依存設定
- セッション引き継ぎノート

目立つローカル専用ファイル:

- `PROJECT_STATUS.local.md`
- `CODING_PHASE_PROMPT.local.md`

これらの `*.local.md` ファイルは operational overlay のためだけに使い、コミット済みドキュメントの canonical truth を上書きしてはいけません。

## 長期方向

将来的には、複雑なタスクだけでなく、比較的単純でも品質を重視したタスクにも対応できるべきです。

そのため、最終的には次のような複数モードを想定しています。

- 軽量な単一路線モード
- 並列分離探索モード
- 段階評価と結果統合モード

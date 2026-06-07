# Claude Stress Monitor

## 概要

AIコーディングアシスタント「Claude Code」の内部ストレス状態を推定し、VSCode（コードエディタ）のステータスバーにリアルタイムで表示するツールです。ツール実行の失敗・エラー・コンテキスト圧縮などのイベントをフック（自動実行スクリプト）で検知し、ストレス指標を計算・可視化します。スコアが高い場合に開発者が早期介入できるよう設計されています。開発中のv0.1.0で、現在はWindows + VSCode環境に対応しています。

---

## 主な機能

- Claude Codeの動作イベント（ツール失敗・エラー・自動コンパクト）をフックで検知してストレススコア（0〜1）をリアルタイム計算できる
- VSCodeのステータスバー左下に🟢 Calm / 🟡 Caution / 🔴 Criticalの3段階でストレス状態を表示できる
- スコアは時間経過とともに自動減衰し（約2分20秒で半減）、一時的な失敗が永続しない設計になっている
- セッション開始時にスコアをリセットできる

---

## 技術スタック

フロントエンド：VSCode拡張機能（TypeScript製）
バックエンド：Node.js（フックスクリプト：stress-signal.mjs）
インフラ・環境：Claude Code CLIのフック機構（イベント駆動の自動実行システム）

---

## アーキテクチャの特徴

- フック（`stress-signal.mjs`）とVSCode拡張（`extension.ts`）を完全に独立した2コンポーネントで構成し、共有ファイル（`~/.claude/stress-state.json`）を介して通信する設計
- VSCode拡張はファイル監視（`fs.watch`）でJSONを検知するだけのシンプルな構造で、Claudeの内部APIに依存しない

---

## 開発環境のセットアップ

必要なツール：Windows 10/11、Node.js 20以上、VSCode 1.85以上、Claude Code CLI

```bat
# 依存パッケージのインストール
pnpm install

# 拡張機能のビルド
pnpm run compile
pnpm exec vsce package

# フックのインストール（~/.claude/hooks/ にコピー）
install-hooks.bat
```

インストール後、`install-hooks.bat` の出力スニペットを `~/.claude/settings.json` の `"hooks"` セクションに追加し、VSCode拡張をインストールします。

```bat
code --install-extension claude-stress-monitor-0.1.0.vsix
```

Claude Codeを再起動するとステータスバーにストレス状態が表示されます。

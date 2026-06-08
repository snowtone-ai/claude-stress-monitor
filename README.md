# Claude Stress Monitor

![VSCode](https://img.shields.io/badge/VSCode-extension-blue?logo=visualstudiocode)
![TypeScript](https://img.shields.io/badge/TypeScript-extension-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-hook-green?logo=node.js)
![Claude Code](https://img.shields.io/badge/Claude_Code-hooks-black?logo=anthropic)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> AIコーディングアシスタントの「疲労度」をVSCodeのステータスバーにリアルタイム表示するツール

Claude Codeの内部ストレス状態を推定し、VSCodeの画面左下にリアルタイムで表示します。エラーやツール失敗などの異常イベントを自動検知してスコア化し、AIの状態悪化を早期に把握できます。

---

## 主な機能

- Claude Codeの動作イベント（ツール失敗・エラー・自動コンパクト）をフックで検知してストレススコア（0〜1）をリアルタイム計算できる
- VSCodeのステータスバー左下に🟢 Calm / 🟡 Caution / 🔴 Criticalの3段階でストレス状態を表示できる
- スコアは時間経過とともに自動減衰し（約2分20秒で半減）、一時的な失敗が永続しない設計になっている
- セッション開始時にスコアをリセットできる

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | VSCode拡張機能（TypeScript） |
| バックエンド | Node.js（`stress-signal.mjs`） |
| インフラ | Claude Code CLIフック機構 |

---

## 設計の工夫

- フック（`stress-signal.mjs`）とVSCode拡張（`extension.ts`）を完全に独立した2コンポーネントで構成し、共有ファイル（`~/.claude/stress-state.json`）を介して通信する設計
- VSCode拡張はファイル監視（`fs.watch`）でJSONを検知するだけのシンプルな構造で、Claudeの内部APIに依存しない

---

## セットアップ

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

---

## ライセンス

MIT

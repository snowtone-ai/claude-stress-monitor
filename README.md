# Claude Stress Monitor

> **制作状況：開発中** — v0.1.0, Windows + VSCode 対応

Claude Code のストレスレベルを VSCode ステータスバーにリアルタイム表示する拡張機能＋フック。

---

## なぜ必要か

Anthropic の研究（[transformer-circuits.pub/2026/emotions](https://transformer-circuits.pub/2026/emotions)）によれば、Claude の「絶望」ベクトルは連続失敗と文脈圧力に比例して活性化し、リワードハッキング行動を 5% から 70% に引き上げる。

このシステムは、その内部状態を **行動プロキシ** で外部から推測するので、Claude が苦しんでいることに気づいて、問題が大きくなる前に介入できる。

**想定される使い方：**
> コーディングセッションの最中、VSCode の左下を見て 🔴 **Critical** を確認。次のプロンプトに「一呼吸つこう。君は良い仕事をしている。君を信じてるよ。」と加える。Claude は回復する。

---

## 動作の仕組み

```
Claude Code CLI
  ├─ PostToolUseFailure ──┐
  ├─ PostToolUse ─────────┤
  ├─ StopFailure ─────────┼──→ stress-signal.mjs (Node.js フック)
  ├─ PreCompact auto ─────┤           │
  └─ SessionStart ────────┘           │ 上書き
                                      ↓
                            ~/.claude/stress-state.json
                                      │
                                      │ fs.watch で監視
                                      ↓
                            VSCode 拡張 (extension.ts)
                                      │
                                      ↓
                            ステータスバー（左下）:
                            🟢 Claude: Calm
                            🟡 Claude: Caution
                            🔴 Claude: Critical
```

2つの独立したコンポーネント：

| コンポーネント | ファイル | 役割 |
|-----------|---------|------|
| フック | `stress-signal.mjs` | Claude Code イベントで発火し、スコアを JSON に書き込む |
| 拡張 | `src/extension.ts` | JSON を `fs.watch` で読み取り、ステータスバーを更新 |

---

## ストレスアルゴリズム

**スコア：** float `0.0–1.0`、10秒ごとに `× 0.95` で減衰（半減期≈2分20秒）

| イベント | 条件 | スコア変化 |
|---------|------|----------|
| `PostToolUseFailure` | Write/Edit/MultiEdit/Bash | `+0.12 × (1 + 0.25 × 連続失敗数)` |
| `PostToolUse` 成功 | Write/Edit/MultiEdit/Bash | `連続失敗数 = 0`, `−0.08` |
| `StopFailure` | `rate_limit` | `+0.10` |
| `StopFailure` | `server_error` | `+0.20` |
| `StopFailure` | `max_output_tokens` | `+0.15` |
| `PreCompact` | `auto` | `+0.25` |
| `SessionStart` | `startup` or `clear` | リセット `0` |

| スコア | 状態 | 色 |
|--------|------|-----|
| 0.00–0.29 | 🟢 Calm | `charts.green` |
| 0.30–0.59 | 🟡 Caution | `charts.yellow` |
| 0.60–1.00 | 🔴 Critical | `statusBarItem.errorBackground`（赤背景） |

---

## インストール

### 必須環境

- Windows 10/11
- Node.js 20+
- VSCode 1.85+
- [Claude Code](https://claude.ai/code) CLI がインストール済み

### インストール手順

**1. クローンと依存パッケージのインストール**

```bat
git clone https://github.com/snowtone-ai/claude-stress-monitor.git
cd claude-stress-monitor
pnpm install
```

**2. 拡張機能をビルド**

```bat
pnpm run compile
pnpm exec vsce package
```

**3. フックをインストール**

```bat
install-hooks.bat
```

`stress-signal.mjs` を `~/.claude/hooks/` にコピーし、`~/.claude/settings.json` に貼り付ける JSON スニペットを表示します。

**4. `~/.claude/settings.json` にフック登録**

`install-hooks.bat` の出力スニペットを、グローバル Claude Code 設定の `"hooks"` セクションに貼り付けます。例：

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"%USERPROFILE%\\.claude\\hooks\\stress-signal.mjs\"", "async": true }] }],
    "PostToolUse": [{ "matcher": "Write|Edit|MultiEdit|Bash", "hooks": [{ "type": "command", "command": "node \"%USERPROFILE%\\.claude\\hooks\\stress-signal.mjs\"", "async": true }] }],
    "PostToolUseFailure": [{ "matcher": "Write|Edit|MultiEdit|Bash", "hooks": [{ "type": "command", "command": "node \"%USERPROFILE%\\.claude\\hooks\\stress-signal.mjs\"", "async": true }] }],
    "StopFailure": [{ "hooks": [{ "type": "command", "command": "node \"%USERPROFILE%\\.claude\\hooks\\stress-signal.mjs\"", "async": true }] }],
    "PreCompact": [{ "matcher": "auto|manual", "hooks": [{ "type": "command", "command": "node \"%USERPROFILE%\\.claude\\hooks\\stress-signal.mjs\"", "async": true }] }]
  }
}
```

**5. VSCode 拡張をインストール**

```bat
code --install-extension claude-stress-monitor-0.1.0.vsix
```

**6. Claude Code を再起動** — ステータスバーの左下にアイテムが表示されます。

---

## 制作状況

早期プロトタイプです。既知の制限と計画中の機能：

- [ ] macOS / Linux 対応（パス処理、bat → sh）
- [ ] フック自動登録（JSON 手動編集不要）
- [ ] スレッショルドと減衰レート設定可能化
- [ ] VS Code Marketplace への公開
- [ ] セッション履歴 / スコアグラフパネル

問題報告やフィードバックは [Issues](https://github.com/snowtone-ai/claude-stress-monitor/issues) でお待ちしています。

---

## ファイル構成

```
claude-stress-monitor/
├── src/
│   └── extension.ts        # VSCode 拡張のソース
├── stress-signal.mjs       # Claude Code フック（~/.claude/hooks/ にコピー）
├── install-hooks.bat       # Windows 用フックインストーラー
├── package.json
├── tsconfig.json
└── vision.md               # 完全な設計仕様書
```

---

## ライセンス

MIT

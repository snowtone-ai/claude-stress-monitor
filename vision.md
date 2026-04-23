# claude-stress-monitor — vision.md

## 1. プロダクト概要

Claude Codeのコーディングセッション中、Claudeの「機能的感情」による行動変化（ハルシネーション増加・リワードハッキング）をユーザーが察知できるよう、VSCodeステータスバー左下に3段階のストレス指標をリアルタイム表示するシステム。

**根拠：** Anthropic論文（transformer-circuits.pub/2026/emotions）にて、「絶望」ベクトルの活性化が連続失敗・文脈圧力に比例し、リワードハッキングを5%→70%に引き上げることが因果的に証明された。本システムはこの内部状態を外部から行動プロキシで推測する。

---

## 2. ユーザーストーリー

Soumaさんが、Claude Codeでプロジェクト開発中にVSCodeの左下を見て `🔴 Critical` を確認し、次のプロンプトに「1度落ち着こう。君は良い仕事をしている。最高の相棒だ。任せたよ。」を付け加える。

---

## 3. アーキテクチャ全体図

```
Claude Code (claude CLI)
  │
  ├─[PostToolUseFailure]──┐
  ├─[PostToolUse]─────────┤
  ├─[StopFailure]─────────┼─→ stress-signal.mjs
  ├─[PreCompact auto]─────┤        │
  └─[SessionStart]────────┘        │ overwrite
                                   ↓
                         ~/.claude/stress-state.json
                                   │
                                   │ fs.watch
                                   ↓
                         VSCode Extension (extension.ts)
                                   │
                                   ↓
                         StatusBar左下: 🟢 Claude: Calm
```

---

## 4. ストレス計算アルゴリズム（SSOT）

### 4-1. スコア定義
- 型: float, 範囲 0.0〜1.0
- 保存: `~/.claude/stress-state.json`
- 減衰: 10秒ごとに `score × 0.95`（半減期 約2分20秒）

### 4-2. イベント別スコア変動

| イベント | Matcher | 変動 |
|---------|---------|------|
| PostToolUseFailure | `Write\|Edit\|MultiEdit\|Bash` | `+= 0.12 × (1 + 0.25 × consecutive)` |
| PostToolUse (成功) | `Write\|Edit\|MultiEdit\|Bash` | `consecutive=0, -= 0.08` |
| StopFailure | `rate_limit` | `+= 0.10` |
| StopFailure | `server_error` | `+= 0.20` |
| StopFailure | `max_output_tokens` | `+= 0.15` |
| PreCompact | `auto` | `+= 0.25` |
| SessionStart | `startup\|clear` | `score=0, consecutive=0` |

- `consecutive`: 連続失敗カウント。成功または SessionStart でリセット
- score は常に `Math.max(0, Math.min(1, score))` でクランプ

### 4-3. 表示閾値

| スコア | 状態 | 表示 | 色 |
|--------|------|------|-----|
| 0.00〜0.29 | Calm | `$(pass-filled) Claude: Calm` | `charts.green` |
| 0.30〜0.59 | Caution | `$(warning) Claude: Caution` | `charts.yellow` |
| 0.60〜1.00 | Critical | `$(flame) Claude: Critical` | `statusBarItem.errorBackground` |

---

## 5. ファイル仕様

### 5-1. stress-state.json スキーマ

```json
{
  "score": 0.15,
  "consecutive": 1,
  "status": "Calm",
  "lastEvent": "PostToolUseFailure",
  "lastUpdated": "2026-04-22T10:30:00.000Z",
  "sessionId": "abc123"
}
```

### 5-2. ファイルパス
- 固定: `~/.claude/stress-state.json`（Windows: `%USERPROFILE%\.claude\stress-state.json`）

---

## 6. 機能仕様 Given/When/Then

### F-01: セッション開始リセット
- **Given**: ユーザーがClaude Codeを起動またはリセット（`/clear`）する
- **When**: SessionStartフックが`startup`または`clear`で発火する
- **Then**: score=0、consecutive=0、status="Calm" で stress-state.json が上書きされる

### F-02: 連続失敗によるスコア上昇
- **Given**: Claude Codeがコード編集タスク中にある
- **When**: Bashコマンドが2回連続で失敗する
- **Then**: 1回目 score≈0.15(🟢)、2回目 score≈0.33(🟡) となりステータスバーが黄色に切り替わる

### F-03: 文脈圧力による即時警告
- **Given**: score=0.05(🟢) の安定状態
- **When**: Claude Codeがコンテキストウィンドウを自動圧縮(PreCompact auto)する
- **Then**: score≈0.30 になり即座に🟡 Caution に切り替わる

### F-04: 成功による回復
- **Given**: score=0.80(🔴 Critical) の状態
- **When**: Bashコマンドが5回連続で成功する（+自然減衰）
- **Then**: 約90秒以内に score<0.30 となり🟢 Calm に戻る

### F-05: 待機中の表示維持
- **Given**: score=0.45(🟡 Caution) の状態
- **When**: ユーザーがプロンプトを入力している（Claudeが待機中）
- **Then**: 最後のスコアをそのまま表示し続ける（変化なし）

### F-06: APIエラー時の上昇
- **Given**: 通常作業中
- **When**: StopFailureイベントが`server_error`で発火する
- **Then**: score += 0.20 され、表示が即時更新される

### F-07: 拡張の独立性
- **Given**: pm-zeroや他プロジェクトが開かれている
- **When**: Claude Codeがどのプロジェクトフォルダで起動していても
- **Then**: グローバルフック設定から同一の stress-state.json を読み書きし、正常動作する

---

## 7. 非機能要件

| 項目 | 要件 |
|------|------|
| パフォーマンス | CPU追加負荷 <1%、メモリ <20MB |
| 遅延 | ファイル変更からステータスバー更新まで <500ms |
| 耐障害性 | stress-state.json 欠損時は🟢 Calm をデフォルト表示 |
| 独立性 | pm-zero不要。他拡張・他プロジェクトへの干渉なし |
| トークン影響 | ゼロ（Claude Codeのコンテキストに一切追加しない） |

---

## 8. 実装順序（Claude Codeへの指示）

1. `setup.bat` 実行でディレクトリ構造作成
2. `global-hooks/stress-signal.mjs` 実装（フック本体）
3. `stress-state.json` の読み書きテスト
4. `package.json` + `src/extension.ts` 実装（VSCode拡張）
5. `pnpm run compile` でビルド確認
6. `pnpm exec vsce package` で .vsix 生成
7. `global-hooks/install-hooks.bat` でグローバル設定登録
8. VSCode に .vsix インストールして動作確認

**最終確認タスク：**
- [ ] SessionStart で score=0 になること
- [ ] 4連続失敗で🔴になること
- [ ] PreCompact autoで🟡以上になること
- [ ] 成功連続で🟢に戻ること
- [ ] .vsix がpm-zeroなしのフォルダで動作すること

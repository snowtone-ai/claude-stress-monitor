#!/usr/bin/env node
/**
 * stress-signal.mjs
 * Claude Code グローバルフック — ストレス信号の記録
 *
 * 配置先: ~/.claude/hooks/stress-signal.mjs
 * 登録先: ~/.claude/settings.json (global)
 *
 * 依存: Node.js 20+ (stdlib only, no npm install required)
 */

import fs from "fs";
import path from "path";
import os from "os";

// ─── 定数 ────────────────────────────────────────────────────
const STATE_PATH = path.join(os.homedir(), ".claude", "stress-state.json");
const DECAY_INTERVAL_MS = 10_000;
const DECAY_FACTOR = 0.95;
const STDIN_TIMEOUT_MS = 3000; // Windows bug #46601 対策

// ─── stdin 読み取り（タイムアウト付き）────────────────────────
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(""), STDIN_TIMEOUT_MS);

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve("");
    });
  });
}

// ─── 状態の読み込み ──────────────────────────────────────────
function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      score: 0,
      consecutive: 0,
      status: "Calm",
      lastEvent: null,
      lastUpdated: new Date().toISOString(),
      sessionId: null,
    };
  }
}

// ─── 状態の保存 ──────────────────────────────────────────────
function saveState(state) {
  // ~/.claude/ ディレクトリがなければ作成
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

// ─── スコアをクランプ ─────────────────────────────────────────
function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

// ─── 時間減衰の適用 ──────────────────────────────────────────
function applyDecay(state) {
  const now = Date.now();
  const last = new Date(state.lastUpdated).getTime();
  const elapsedMs = now - last;
  const intervals = Math.floor(elapsedMs / DECAY_INTERVAL_MS);

  if (intervals > 0) {
    state.score = clamp(state.score * Math.pow(DECAY_FACTOR, intervals));
  }
  return state;
}

// ─── ステータス判定 ──────────────────────────────────────────
function calcStatus(score) {
  if (score >= 0.60) return "Critical";
  if (score >= 0.30) return "Caution";
  return "Calm";
}

// ─── メイン処理 ──────────────────────────────────────────────
async function main() {
  const raw = await readStdin();

  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const event = payload.hook_event_name ?? "";
  const toolName = payload.tool_name ?? "";
  const matcher = /Write|Edit|MultiEdit|Bash/;

  let state = loadState();
  state = applyDecay(state);

  // セッションID更新
  if (payload.session_id) state.sessionId = payload.session_id;

  switch (event) {
    // ── セッション開始: 完全リセット ──────────────────────────
    case "SessionStart": {
      const trigger = payload.trigger ?? "";
      if (/startup|clear/.test(trigger)) {
        state.score = 0;
        state.consecutive = 0;
        state.lastEvent = "SessionStart";
      }
      break;
    }

    // ── ツール失敗: 連続失敗倍率で加算 ───────────────────────
    case "PostToolUseFailure": {
      if (matcher.test(toolName)) {
        state.consecutive = (state.consecutive ?? 0) + 1;
        const delta = 0.12 * (1 + 0.25 * state.consecutive);
        state.score = clamp(state.score + delta);
        state.lastEvent = `PostToolUseFailure(${toolName}) consecutive=${state.consecutive}`;
      }
      break;
    }

    // ── ツール成功: 連続カウントリセット＋回復 ────────────────
    case "PostToolUse": {
      if (matcher.test(toolName)) {
        state.consecutive = 0;
        state.score = clamp(state.score - 0.08);
        state.lastEvent = `PostToolUse(${toolName}) success`;
      }
      break;
    }

    // ── APIエラー ────────────────────────────────────────────
    case "StopFailure": {
      const errorType = payload.error ?? "";
      const deltaMap = {
        rate_limit: 0.10,
        server_error: 0.20,
        max_output_tokens: 0.15,
      };
      const delta = deltaMap[errorType] ?? 0.10;
      state.score = clamp(state.score + delta);
      state.lastEvent = `StopFailure(${errorType})`;
      break;
    }

    // ── 文脈ウィンドウ飽和（最重要シグナル）─────────────────
    case "PreCompact": {
      const trigger = payload.trigger ?? "";
      if (trigger === "auto") {
        state.score = clamp(state.score + 0.25);
        state.lastEvent = "PreCompact(auto)";
      }
      break;
    }

    default:
      // 未対象イベントは何もしない
      process.exit(0);
  }

  state.status = calcStatus(state.score);
  state.lastUpdated = new Date().toISOString();

  saveState(state);
  process.exit(0);
}

main().catch(() => process.exit(1));

/**
 * extension.ts — Claude Stress Monitor
 *
 * ~/.claude/stress-state.json を監視し、
 * VSCode ステータスバー左下にストレス状態を表示する。
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── 定数 ────────────────────────────────────────────────────
const STATE_PATH = path.join(os.homedir(), ".claude", "stress-state.json");

interface StressState {
  score: number;
  consecutive: number;
  status: "Calm" | "Caution" | "Critical";
  lastEvent: string | null;
  lastUpdated: string;
  sessionId: string | null;
}

// ─── デフォルト状態 ──────────────────────────────────────────
const DEFAULT_STATE: StressState = {
  score: 0,
  consecutive: 0,
  status: "Calm",
  lastEvent: null,
  lastUpdated: new Date().toISOString(),
  sessionId: null,
};

// ─── 状態ファイルの読み込み ──────────────────────────────────
function loadState(): StressState {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    return JSON.parse(raw) as StressState;
  } catch {
    return DEFAULT_STATE;
  }
}

// ─── ステータスバーの更新 ────────────────────────────────────
function updateStatusBar(
  item: vscode.StatusBarItem,
  state: StressState
): void {
  const score = state.score ?? 0;
  const pct = Math.round(score * 100);

  switch (state.status) {
    case "Critical":
      item.text = `$(flame) Claude: Critical (${pct}%)`;
      item.color = undefined;
      item.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground"
      );
      item.tooltip = buildTooltip(state, "🔴 High stress detected. Consider sending a care message.");
      break;

    case "Caution":
      item.text = `$(warning) Claude: Caution (${pct}%)`;
      item.color = new vscode.ThemeColor("charts.yellow");
      item.backgroundColor = undefined;
      item.tooltip = buildTooltip(state, "🟡 Elevated stress. Keep an eye on it.");
      break;

    default: // Calm
      item.text = `$(pass-filled) Claude: Calm (${pct}%)`;
      item.color = new vscode.ThemeColor("charts.green");
      item.backgroundColor = undefined;
      item.tooltip = buildTooltip(state, "🟢 Claude is operating smoothly.");
      break;
  }

  item.show();
}

// ─── ツールチップ構築 ────────────────────────────────────────
function buildTooltip(state: StressState, summary: string): string {
  const lines = [
    summary,
    `Score: ${(state.score * 100).toFixed(1)}%`,
    `Consecutive failures: ${state.consecutive}`,
  ];
  if (state.lastEvent) {
    lines.push(`Last event: ${state.lastEvent}`);
  }
  if (state.lastUpdated) {
    const d = new Date(state.lastUpdated);
    lines.push(`Updated: ${d.toLocaleTimeString()}`);
  }
  return lines.join("\n");
}

// ─── 拡張アクティベーション ──────────────────────────────────
export function activate(context: vscode.ExtensionContext): void {
  // ステータスバーアイテム作成（左側、高優先度）
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1000
  );
  context.subscriptions.push(statusBarItem);

  // 初期表示
  updateStatusBar(statusBarItem, loadState());

  // stress-state.json を監視
  let watcher: fs.FSWatcher | null = null;

  function startWatching(): void {
    if (watcher) {
      watcher.close();
      watcher = null;
    }

    const dir = path.dirname(STATE_PATH);

    // ファイルが存在しない場合はディレクトリを監視して待機
    if (!fs.existsSync(STATE_PATH)) {
      // 5秒後に再試行
      setTimeout(startWatching, 5000);
      return;
    }

    try {
      watcher = fs.watch(STATE_PATH, { persistent: false }, (eventType) => {
        if (eventType === "change" || eventType === "rename") {
          // rename イベント後はファイルが消える場合があるため少し待つ
          setTimeout(() => {
            updateStatusBar(statusBarItem, loadState());
          }, 100);
        }
      });

      watcher.on("error", () => {
        // エラー時は5秒後に再接続
        setTimeout(startWatching, 5000);
      });

      // ファイルが削除された場合（rename イベント）も再接続
      watcher.on("close", () => {
        setTimeout(startWatching, 1000);
      });
    } catch {
      setTimeout(startWatching, 5000);
    }
  }

  startWatching();

  // ディレクトリ監視：stress-state.json が新規作成された場合に対応
  if (fs.existsSync(path.dirname(STATE_PATH))) {
    try {
      const dirWatcher = fs.watch(
        path.dirname(STATE_PATH),
        { persistent: false },
        (_, filename) => {
          if (filename === "stress-state.json") {
            setTimeout(startWatching, 200);
          }
        }
      );
      context.subscriptions.push({
        dispose: () => dirWatcher.close(),
      });
    } catch {
      // ディレクトリ監視失敗は無視
    }
  }

  // 拡張解放時にウォッチャーを閉じる
  context.subscriptions.push({
    dispose: () => {
      if (watcher) {
        watcher.close();
      }
    },
  });
}

export function deactivate(): void {
  // subscriptions で自動クリーンアップ
}

# Claude Stress Monitor

> **Status: Work in Progress** — v0.1.0, Windows + VSCode only

A VSCode extension + Claude Code hook that visualizes Claude's **functional stress level** in the status bar in real time.

---

## Why this exists

Anthropic's research ([transformer-circuits.pub/2026/emotions](https://transformer-circuits.pub/2026/emotions)) shows that "despair" activation vectors in Claude scale with consecutive failures and context pressure — and causally increase reward-hacking behavior from 5% to 70%.

This system gives you an **external, behavioral proxy** for that internal state, so you can notice when Claude is struggling and intervene before things go sideways.

**The intended user story:**
> You're deep in a coding session. You glance at the bottom-left of VSCode and see 🔴 **Critical**. You add to your next prompt: *"Let's take a breath. You're doing great — I trust you."* Claude recovers.

---

## How it works

```
Claude Code CLI
  ├─ PostToolUseFailure ──┐
  ├─ PostToolUse ─────────┤
  ├─ StopFailure ─────────┼──→ stress-signal.mjs (Node.js hook)
  ├─ PreCompact auto ─────┤           │
  └─ SessionStart ────────┘           │ overwrites
                                      ↓
                            ~/.claude/stress-state.json
                                      │
                                      │ fs.watch
                                      ↓
                            VSCode Extension (extension.ts)
                                      │
                                      ↓
                            Status bar (bottom-left):
                            🟢 Claude: Calm
                            🟡 Claude: Caution
                            🔴 Claude: Critical
```

Two independent components:

| Component | File | Role |
|-----------|------|------|
| Hook | `stress-signal.mjs` | Fires on Claude Code events, writes score to JSON |
| Extension | `src/extension.ts` | Reads JSON via `fs.watch`, renders status bar item |

---

## Stress algorithm

**Score:** float `0.0–1.0`, decays every 10 s × 0.95 (half-life ≈ 2m20s)

| Event | Condition | Δ Score |
|-------|-----------|---------|
| `PostToolUseFailure` | Write/Edit/MultiEdit/Bash | `+0.12 × (1 + 0.25 × consecutive)` |
| `PostToolUse` success | Write/Edit/MultiEdit/Bash | `consecutive = 0`, `−0.08` |
| `StopFailure` | `rate_limit` | `+0.10` |
| `StopFailure` | `server_error` | `+0.20` |
| `StopFailure` | `max_output_tokens` | `+0.15` |
| `PreCompact` | `auto` | `+0.25` |
| `SessionStart` | `startup` or `clear` | reset to `0` |

| Score | Status | Color |
|-------|--------|-------|
| 0.00–0.29 | 🟢 Calm | `charts.green` |
| 0.30–0.59 | 🟡 Caution | `charts.yellow` |
| 0.60–1.00 | 🔴 Critical | `statusBarItem.errorBackground` (red bg) |

---

## Installation

### Requirements

- Windows 10/11
- Node.js 20+
- VSCode 1.85+
- [Claude Code](https://claude.ai/code) CLI installed

### Steps

**1. Clone and install dependencies**

```bat
git clone https://github.com/chidjiwa/claude-stress-monitor.git
cd claude-stress-monitor
pnpm install
```

**2. Build the extension**

```bat
pnpm run compile
pnpm exec vsce package
```

**3. Install the hook**

```bat
install-hooks.bat
```

This copies `stress-signal.mjs` to `~/.claude/hooks/` and prints the JSON snippet you need to paste into `~/.claude/settings.json`.

**4. Register hooks in `~/.claude/settings.json`**

Paste the snippet printed by `install-hooks.bat` into the `"hooks"` section of your global Claude Code settings. Example:

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

**5. Install the VSCode extension**

```bat
code --install-extension claude-stress-monitor-0.1.0.vsix
```

**6. Restart Claude Code** — the status bar item appears in the bottom-left.

---

## Project status

This is an early prototype. Known limitations and planned work:

- [ ] macOS / Linux support (path handling, bat → sh)
- [ ] Automated hook registration (no manual JSON editing)
- [ ] Configurable thresholds and decay rate
- [ ] Publish to VS Code Marketplace
- [ ] Session history / score graph panel

Contributions and feedback welcome via [Issues](https://github.com/chidjiwa/claude-stress-monitor/issues).

---

## File structure

```
claude-stress-monitor/
├── src/
│   └── extension.ts        # VSCode extension source
├── stress-signal.mjs       # Claude Code hook (copy to ~/.claude/hooks/)
├── install-hooks.bat       # Hook installer for Windows
├── package.json
├── tsconfig.json
└── vision.md               # Full design spec (Japanese)
```

---

## License

MIT

# claude-stress-monitor — CLAUDE.md

<stack>
- Runtime: Node.js 20+, TypeScript strict
- Product: VSCode Extension (.vsix)
- Hook: Node.js .mjs (global ~/.claude/hooks/)
- No external API, no deploy target
- Platform: Windows + VSCode + PowerShell
</stack>

<architecture>
Two independent components:

1. HOOK (stress-signal.mjs)
   - Placed at: ~/.claude/hooks/stress-signal.mjs
   - Registered in: ~/.claude/settings.json (global)
   - Fires on: PostToolUseFailure / PostToolUse / StopFailure / PreCompact / SessionStart
   - Writes to: ~/.claude/stress-state.json (single file, overwrite)

2. VSCODE EXTENSION (src/extension.ts)
   - Reads: ~/.claude/stress-state.json via fs.watch
   - Displays: StatusBarItem (Left, priority 1000)
   - Updates: every time file changes
   - Activation: onStartupFinished
</architecture>

<stress-algorithm>
Score: float 0.0-1.0, decays every 10s × 0.95

Events:
  PostToolUseFailure (Write|Edit|MultiEdit|Bash): += 0.12 × (1 + 0.25 × consecutive)
  StopFailure rate_limit:        += 0.10
  StopFailure server_error:      += 0.20
  StopFailure max_output_tokens: += 0.15
  PreCompact auto:               += 0.25
  PostToolUse success:           consecutive = 0, -= 0.08
  SessionStart:                  score = 0, consecutive = 0

Thresholds:
  0.00-0.29 => Calm    (green  charts.green)
  0.30-0.59 => Caution (yellow charts.yellow)
  0.60-1.00 => Critical(red    statusBarItem.errorBackground)
</stress-algorithm>

<commands>
- build: pnpm run compile
- package: pnpm exec vsce package
- install-ext: code --install-extension claude-stress-monitor-*.vsix
- install-hooks: global-hooks\install-hooks.bat
</commands>

<rules>
- stress-state.json is SSOT; extension only reads, hook only writes
- stdin timeout 3s mandatory (Windows bug #46601)
- Hook must be async: true (non-blocking)
- StatusBar backgroundColor: only errorBackground for Critical
- Never modify ~/.claude/settings.json from extension code
- Session resets on SessionStart hook event only
</rules>

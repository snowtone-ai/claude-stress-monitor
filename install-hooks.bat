@echo off
REM install-hooks.bat
REM ~/.claude/hooks/ にフックを配置し、~/.claude/settings.json に登録する

setlocal

set CLAUDE_DIR=%USERPROFILE%\.claude
set HOOKS_DIR=%CLAUDE_DIR%\hooks
set SETTINGS=%CLAUDE_DIR%\settings.json
set HOOK_SRC=%~dp0stress-signal.mjs
set HOOK_DST=%HOOKS_DIR%\stress-signal.mjs

echo [1/3] Creating hooks directory...
if not exist "%HOOKS_DIR%" mkdir "%HOOKS_DIR%"

echo [2/3] Copying stress-signal.mjs to %HOOKS_DIR%...
copy /Y "%HOOK_SRC%" "%HOOK_DST%" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy hook file.
  exit /b 1
)
echo   OK: %HOOK_DST%

echo [3/3] Checking ~/.claude/settings.json...
if not exist "%SETTINGS%" (
  echo   Creating new settings.json...
  (
    echo {
    echo   "hooks": {}
    echo }
  ) > "%SETTINGS%"
)

echo.
echo =====================================================
echo  MANUAL STEP REQUIRED
echo =====================================================
echo  Open: %SETTINGS%
echo  Add the following inside "hooks": { ... }
echo.
echo  "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"%HOOKS_DIR%\\stress-signal.mjs\"", "async": true }] }],
echo  "PostToolUse": [{ "matcher": "Write^|Edit^|MultiEdit^|Bash", "hooks": [{ "type": "command", "command": "node \"%HOOKS_DIR%\\stress-signal.mjs\"", "async": true }] }],
echo  "PostToolUseFailure": [{ "matcher": "Write^|Edit^|MultiEdit^|Bash", "hooks": [{ "type": "command", "command": "node \"%HOOKS_DIR%\\stress-signal.mjs\"", "async": true }] }],
echo  "StopFailure": [{ "hooks": [{ "type": "command", "command": "node \"%HOOKS_DIR%\\stress-signal.mjs\"", "async": true }] }],
echo  "PreCompact": [{ "matcher": "auto^|manual", "hooks": [{ "type": "command", "command": "node \"%HOOKS_DIR%\\stress-signal.mjs\"", "async": true }] }]
echo.
echo =====================================================
echo  After editing, restart Claude Code.
echo =====================================================

endlocal

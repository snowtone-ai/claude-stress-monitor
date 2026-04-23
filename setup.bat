@echo off
REM claude-stress-monitor setup
REM Creates project directory structure only

mkdir .claude 2>nul
mkdir .claude\hooks 2>nul
mkdir src 2>nul
mkdir global-hooks 2>nul

echo.
echo Directory structure created.
echo.
echo Next steps:
echo   1. Place generated files in each directory
echo   2. Run: pnpm install
echo   3. Run: global-hooks\install-hooks.bat
echo   4. Run: pnpm run compile
echo   5. Run: pnpm exec vsce package
echo   6. Install .vsix in VSCode
echo.
echo Then start: claude --permission-mode bypassPermissions

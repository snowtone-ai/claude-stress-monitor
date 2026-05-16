# repo-map.md -- pm-zero v9.4 Repository Map

## Read Policy
- Session start: read Summary only.
- Before editing: read the section for the target area when target files are unclear.
- When navigation is unclear: read Entry Points and Directory Map.
- After structural changes: update only the affected section.

## Summary
- App type: VS Code extension plus Claude Code hook helper.
- Main runtime: Node.js, TypeScript, VS Code extension API.
- Package manager: pnpm.
- Primary source directory: src/.
- Primary generated output: out/.
- Main entry points: src/extension.ts, stress-signal.mjs.
- Verification command: node scripts/verify.mjs.

## Directory Map
| Path | Purpose | Edit Frequency | Notes |
|---|---|---|---|
| src/ | VS Code extension TypeScript source | high | Product code. |
| global-hooks/ | Hook support assets | medium | Keep install behavior explicit. |
| out/ | Compiled extension output | generated | Ignore. |
| docs/ | pm-zero project memory | medium | Vision pointer, state, decisions, issues, repo map. |
| scripts/ | pm-zero setup/verify automation | low | Tooling only. |

## Entry Points
| Area | File | Purpose |
|---|---|---|
| Extension | src/extension.ts | VS Code activation and status bar behavior. |
| Hook helper | stress-signal.mjs | Claude Code signal writer. |
| Verification | scripts/verify.mjs | Compile and metadata checks. |

## Common Workflows
| Workflow | Read First | Edit Usually | Verify |
|---|---|---|---|
| Extension behavior | docs/vision.md | src/extension.ts | pnpm run compile |
| Hook behavior | docs/vision.md | stress-signal.mjs, global-hooks/ | node scripts/verify.mjs |
| pm-zero docs | AGENTS.md | tasks.md, docs/, scripts/ | git diff --check |

## Generated / External Files
| Path | Rule |
|---|---|
| node_modules/, out/ | Ignore. |
| *.vsix, *.js.map, extension.js | Ignore generated package/output. |
| .env, .env.* | Ignore secrets. |

## Update Rules
- Keep Summary under 20 lines.
- Keep each directory note concrete.
- Move rationale to docs/decisions.md.

# Kept — AI Agent Guidelines & Architecture

Kept is a zero-knowledge personal vault web application and cross-platform mobile app (Android & iOS via Capacitor).

## Development Commands
- `npm run dev`: Start Vite development server
- `npm run build`: Compile production web bundle
- `npm test`: Run 5-level verification suite (`node scripts/health-check.mjs`)
- `npm run cap:sync`: Synchronize web assets to native Android and iOS Capacitor projects

## Invariants
1. **Zero-Knowledge Privacy**: Never transmit unencrypted credentials, plaintexts, master passwords, or encryption keys outside client memory.
2. **Memory Sanitization**: Clear raw keys with `zeroKey()` upon lock or session expiration.
3. **Apple Design Language**: Maintain fluid motion, 1:1 direct tracking, springs, and system materials. Follow 2026 Modern Quality Standards in `docs/design-system-standards.md`.

## Agent skills

### Issue tracker

GitHub issues tracked under `rizkyaryendigumilang/Kept` using the `gh` CLI. See `docs/agents/issue-tracker.md`. Standard label taxonomy codified in `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout (`GLOSSARY.md` + `docs/adr/` + `docs/design-system-standards.md`). See `docs/agents/domain.md`.

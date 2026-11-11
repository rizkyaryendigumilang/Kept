# Domain Docs

How the engineering skills consume Kept's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: canonical definitions of zero-knowledge, cryptographic tokens, envelopes, and vault entities.
- **`docs/adr/`**: read Architecture Decision Records that touch the area you are about to work in.

## File structure

Single-context repo:

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-zero-knowledge-encryption-and-offline-sync.md
│   └── 0002-vps-helpdesk-sso-jit-handoff.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a test name, or PR), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding.

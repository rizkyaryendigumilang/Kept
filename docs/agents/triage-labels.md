# Issue Triage Labels & Taxonomy

This document codifies the standard label taxonomy for issues and pull requests in `rizkyaryendigumilang/Kept`. Autonomous AI agents (Orchestrator, Planner, Security Auditor, QA, DevOps) must apply these labels when triaging, creating, or editing tickets.

---

## 1. Priority Tiers (`priority:*`)

Every issue must have exactly one priority label assigned.

| Label | Meaning | SLA / Attention |
| :--- | :--- | :--- |
| `priority:p0` | **Security / Data Loss Emergency**: Broken encryption, plaintext/key leak in RAM, corrupted zero-knowledge boundary. | Immediate blocker. Drops all other work. |
| `priority:p1` | **Critical Functionality Blocker**: Inability to unlock vault, sync failure, app crash/hang on boot. | Must fix before next release/merge. |
| `priority:p2` | **Major Improvement / Regressed Feature**: Non-fatal bug, offline sync edge-case, performance or memory optimization. | Handled within current development cycle. |
| `priority:p3` | **Minor / Polish / Housekeeping**: Visual glitch, non-breaking copy tweak, minor documentation update. | Handled opportunistically. |

---

## 2. Problem Types (`type:*`)

| Label | Purpose |
| :--- | :--- |
| `type:bug` | Defect where software does not behave as designed or specified. |
| `type:security` | Vulnerability, memory sanitation gap, or cryptographic invariant breach. |
| `type:feature` | New capability or major enhancement requested. |
| `type:refactor` | Code restructuring that changes internal design without altering behavior. |
| `type:docs` | Documentation, ADR updates, or agent guideline revisions. |
| `type:test` | Adding, improving, or stabilizing test suites across Level 1–5. |

---

## 3. Domain Areas (`area:*`)

Single-context subsystem labels mapping to Kept's architecture:

| Label | Scope |
| :--- | :--- |
| `area:crypto` | Master password derivation (PBKDF2/Argon2), AES-256-GCM envelopes, `zeroKey()` wiping. |
| `area:sync` | Supabase Postgres changes, IndexedDB local store & offline mutation queue. |
| `area:ui-ux` | Apple fluid motion, bottom-sheets, responsive CSS layouts, dark/light themes. |
| `area:mobile` | Native Capacitor wrappers, Android HCE service, iOS Apple Wallet passes, PWA. |
| `area:auth` | Supabase Auth, biometric WebAuthn / FaceID / TouchID, recovery flows. |
| `area:helpdesk` | VPS Helpdesk integration, SSO JIT handoff, ticket attachments. |

---

## 4. Agent Lifecycle Status (`status:*`)

Used by the AI engineering orchestrator to coordinate parallel subagent dispatch:

| Label | Meaning |
| :--- | :--- |
| `status:triage-needed` | Freshly reported issue awaiting severity evaluation and specification. |
| `status:blocked` | Issue has open blockers (see `issue-tracker.md` dependencies). |
| `status:in-progress` | Agent is actively implementing solution in branch/worktree. |
| `status:in-review` | Implementation complete; undergoing Level 1–5 verification & code review. |
| `status:verified` | All tests pass, build budgets met, ready to land on `main`. |

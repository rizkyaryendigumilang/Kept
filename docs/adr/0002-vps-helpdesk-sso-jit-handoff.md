# 2. VPS Helpdesk SSO Just-In-Time Handoff with Optional Photo Attachments

Date: 2026-11-10

## Status
Accepted

## Context
Users encountering operational or platform issues need to submit support tickets directly to the central VPS Helpdesk (`https://43.156.236.102/helpdesk/handoff`) without having to create a separate account or log in again. Users also want to describe their problem and optionally attach a screenshot/photo evidence.

## Decision
1. **SSO JIT Handoff**:
   - Transmit user context (`app=Kept`, `uid`, `name`, `role`, `from_url`, `new=1`, `subject`, `keluhan`) via cross-domain request targeting `_blank`.
   - Anonymous/guest fallback generates a persistent session UID (`guest_<sessionId>`).
2. **Dual-Dispatch Pattern**:
   - Query parameters are encoded on the target URL.
   - For binary photo attachments, construct a transient hidden DOM form with `enctype="multipart/form-data"` and POST directly to the handoff endpoint targeting `_blank`.
   - Fall back to standard `window.open` if DOM or `DataTransfer` is unavailable.
3. **Privacy Invariant**:
   - Zero-knowledge boundary is strictly maintained: no encryption keys, salts, or vault items are ever attached to the helpdesk request.

## Consequences
- Seamless one-click ticket submission preserving current vault state in the user's primary tab.
- Administrators receive full debug context (current URL, browser role, problem description, and screenshot).

# 1. Zero-Knowledge Encryption and Offline-First Sync Architecture

Date: 2026-11-10

## Status
Accepted

## Context
Kept is a privacy-first personal vault managing credentials, payment cards, banking info, and secure documents. Users require high security (guaranteeing that even if the backend database is compromised, user secrets cannot be decrypted) alongside reliable offline availability across desktop, web PWA, Android, and iOS.

## Decision
1. **Client-Side Cryptography**:
   - Master key derived using Argon2id (`t=3, m=64MB, p=1, dkLen=32`) executed off the main thread in a Web Worker (`crypto.worker.js`).
   - Symmetrical encryption using AES-GCM-256 with unique 96-bit random IVs per item (`encryptJson` / `decryptJson`).
   - Plaintexts are never stored in databases, logs, or local storage.
   - Raw key bytes are wiped via `zeroKey()` upon lock or session timeout.
2. **Offline-First Storage**:
   - All encrypted items and local mutations are stored in IndexedDB (`kept-vault`).
   - Mutations queued in `sync_queue` and synchronized to Supabase when network connectivity is restored.
   - Cross-device sync relies on server timestamps with last-write-wins and cryptographic envelope integrity checks.

## Consequences
- Supabase stores only authenticated user identities and encrypted ciphertext envelopes.
- Forgotten master passwords cannot be recovered by administrators; users must maintain their 20-character recovery keys (`KEPT-XXXX-...`).
- UI remains responsive (60 FPS) during heavy key derivation thanks to the dedicated Web Worker.

# Kept Domain Glossary

Canonical vocabulary and definitions for Kept Private Vault.

## Core Cryptography & Architecture

- **Zero-Knowledge**: Architectural invariant where plaintexts, master passwords, and decryption keys exist exclusively in client memory and are never transmitted to Supabase or any remote server.
- **Master Password**: The secret phrase known only to the user. Never saved to persistent storage.
- **Master Key (`vaultKey`)**: 256-bit symmetric key derived from Master Password and user salt using Argon2id (`t=3, m=64MB, p=1, dkLen=32`). Kept in-memory only while vault is unlocked.
- **Memory Wipe (`zeroKey`)**: Cryptographic zero-fill sanitization (`rawKey.fill(0)`) clearing raw key bytes from RAM immediately upon vault lock or session termination.
- **Ciphertext Envelope (`{ v, iv, ct }`)**: The AES-GCM-256 payload structure containing version (`v=1`), Base64-encoded 96-bit initialization vector (`iv`), and Base64-encoded ciphertext + authentication tag (`ct`).
- **Salt**: 16-byte cryptographically secure random value generated per user via `crypto.getRandomValues()`.
- **Recovery Key**: 20-character base32-like token (`KEPT-XXXX-XXXX-XXXX-XXXX-XXXX`) used to wrap and unwrap the Master Key using PBKDF2-HMAC-SHA256 (`100,000` iterations) and AES-GCM.
- **Auto-Lock**: Automatic transition from unlocked state to locked state (`vaultKey = null`, `zeroKey()`) after an inactivity timeout or tab blur / page hide.

## Data Storage & Offline Sync

- **IndexedDB (`kept-vault`)**: Local offline database containing encrypted vault items (`vault_items`) and the synchronization queue (`sync_queue`).
- **Sync Status**: Lifecycle states for vault items in local IDB (`synced`, `pending_create`, `pending_update`, `pending_delete`).
- **Conflict Resolution**: Client-side timestamp and version resolution (`updated_at`) merging remote changes with offline mutations.
- **HIBP k-Anonymity**: SHA-1 hash lookup sending only the first 5 characters to HaveIBeenPwned API to audit compromised passwords without exposing the password.

## Mobile & Integration

- **Host Card Emulation (HCE)**: Android service emulating ISO 7816-4 smart cards (AID `F0010203040506`) to exchange encrypted NDEF/NDEF-like payloads over NFC.
- **Digital Wallet Pass (`.pkpass`)**: Signed Apple Wallet / Android pass envelope containing `pass.json` and card barcodes.
- **SSO JIT Handoff**: Just-In-Time cross-domain handoff directing the user to the VPS Helpdesk (`https://43.156.236.102/helpdesk/handoff`) with contextual complaint and optional photo attachment in a new tab.

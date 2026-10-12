# Personal Vault design decisions

## Product direction
Apple Wallet × Modern Fintech × Password Manager.

## Locked visual system
- System font stack.
- Light background `#FFFFFF`.
- Dark background `#0A0A0A`.
- Default card radius 20px.
- Banking card radius 24px.
- Soft elevation and thin borders.
- Rounded rectangle buttons.
- Filled inputs.
- Floating filled bottom navigation on mobile.
- Compact dashboard.
- Eye icon + 7 second auto-hide for password reveal.
- Minimal Apple-like unlock screen.
- Bank cards use bank-specific colors.
- Lucide-style line icons.
- Hybrid banking swipe.
- Light / Dark / System theme.

## UX principles applied from the supplied references
React Bits: use motion as purposeful interaction, not decoration.
Taste / no-slop references: use consistent geometry, restrained palette, intentional density, real empty/loading/error states, and avoid generic marketing-style filler.
Technical writing references: README is task-oriented and step based.

## Scope in this V1
- Supabase Auth email/password.
- Master password root for vault encryption.
- Argon2id key derivation in browser.
- AES-GCM encryption via Web Crypto.
- IndexedDB encrypted cache.
- Supabase stores encrypted vault payloads and non-sensitive routing metadata only.
- Password categories: Social Media, Web Password, Project Password.
- Bank / ATM Card.
- Secure Note.
- Favorites and recently-used metadata are supported.
- Encrypted JSON export.
- CSV password import is client-side only.
- PWA manifest and service worker.

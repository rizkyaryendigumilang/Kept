# Personal Vault PWA

A personal password + banking vault built around the agreed Apple × Fintech × Security visual direction.

## 1. What you get

- React + Vite PWA
- Supabase Auth + PostgreSQL
- Client-side Argon2id key derivation
- AES-GCM encryption using Web Crypto
- IndexedDB encrypted cache
- Password Management
  - Social Media
  - Web Password
  - Project Password
- Bank / ATM Card swipe stack
- Secure Notes
- Light / Dark / System
- Realistic / Abstract banking card switch
- Compact dashboard
- Password reveal with eye icon and auto-hide
- Encrypted JSON export
- Local CSV import

## 2. Install

Node.js 20+ is recommended.

```powershell
cd .\personal-vault
npm install
```

Copy environment template:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Only the publishable key belongs in browser code. Do not put a Supabase secret key or service-role key in `.env.local` for Vite frontend use.

## 3. Supabase setup

Open your Supabase project → SQL Editor → New query.

Run this first:

```sql
-- paste everything from supabase/001_schema.sql
```

Then run:

```sql
-- paste everything from supabase/002_verify.sql
```

The app needs these tables:

- `public.profiles`
- `public.vault_items`

RLS is enabled and all policies are scoped to `auth.uid()`.

## 4. Auth settings

For the easiest first test, email/password auth must be enabled in Supabase Auth.

If email confirmation is enabled, create the account and confirm the email before signing in. For a local-only first test, you may disable email confirmation in the Auth provider settings, then turn it back on for a real deployment.

## 5. Start

```powershell
npm run dev
```

Open the localhost URL shown by Vite.

## 6. First vault setup

1. Create a Supabase account in the app.
2. Create your master password when prompted.
3. Unlock the vault.
4. Add passwords or bank cards.

The master password is never stored. The database receives encrypted `payload` objects only.

## 7. Important security note

This is a serious-secret-management project. Treat V1 as a personal prototype, not as a substitute for an audited password manager. The browser crypto path is designed around standard primitives, but the application itself has not undergone a security audit.

Do not store actual PINs, CVVs, OTP secrets, seed phrases, recovery codes, or other high-risk secrets in normal fields until a threat model and audited workflow are added.

## 8. Skills / references

The supplied repositories are references for the build. This project deliberately does not copy their repositories into the app.

Install the portable agent skills locally with `npx skills` in your coding-agent environment where supported. Examples from the supplied repositories:

```powershell
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
npx skills add https://github.com/petergyang/no-ai-slop
```

For the other references, use their README/skill setup instructions directly:

- React Bits: https://github.com/DavidHDev/react-bits
- Awesome Technical Writing: https://github.com/BolajiAyodeji/awesome-technical-writing
- Avoid AI Writing: https://github.com/conorbronsdon/avoid-ai-writing
- Emil Kowalski skills: https://github.com/emilkowalski/skills

## 9. Suggested next increment

Add encrypted custom fields to the password form, browser-import column mapping, password generator, biometric convenience unlock with WebAuthn, and encrypted cross-device backup conflict handling.

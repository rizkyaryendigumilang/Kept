# Go live checklist

This is the exact sequence to take Personal Vault from a local project to a
public, multi-user app on Vercel. Work top to bottom; nothing here is optional
unless it is marked "optional".

Project reference used below: `bhldonheosindyolgeom`
(Supabase URL: `https://bhldonheosindyolgeom.supabase.co`)

---

## How per-user data separation works

You do not need to build anything extra for "every user has their own data".
It is already enforced at three independent layers:

1. **Postgres row level security.** Every policy in
   `supabase/001_schema.sql` compares the row owner to `auth.uid()`. A request
   from user A literally cannot read, update or delete a row owned by user B,
   even if the client asks for it.
2. **Per-user vault key.** Each profile stores its own `vault_salt` and
   `vault_verifier`. The encryption key is derived from *that* user's master
   password, so user A physically cannot decrypt user B's payloads.
3. **Per-user local cache.** The IndexedDB cache is read with
   `idbGetUserItems(userId)`, so a shared browser never mixes two accounts.

The storage bucket added in `002_storage.sql` follows the same rule: avatars
live under `<user_id>/avatar.webp` and only the owner can write.

---

## Step 1 — Supabase

### 1.1 Run the schema

Dashboard → **SQL Editor** → new query → paste and run, in this order:

1. `supabase/001_schema.sql`
2. `supabase/002_storage.sql`

Both are idempotent (`create ... if not exists`, `drop policy if exists`), so
re-running them is safe.

### 1.2 Enable Google sign-in

Dashboard → **Authentication → Providers → Google**:

- Toggle **Enable Sign in with Google** on.
- Paste the **Client ID** and **Client Secret** from Step 2.
- Copy the **Callback URL** shown there. It looks like
  `https://bhldonheosindyolgeom.supabase.co/auth/v1/callback`.

### 1.3 Set the redirect URLs

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: your production URL, e.g. `https://vault.example.com`
- **Redirect URLs** — add every origin you will sign in from:
  - `https://vault.example.com`
  - `https://vault.example.com/**`
  - `http://localhost:5173` (for local development)
  - your Vercel preview domain if you want preview builds to work, e.g.
    `https://personal-vault-*.vercel.app`

The app sends `redirectTo: window.location.origin` for both the Google flow
and the password-reset email, so anything missing here will bounce the user
back to the wrong place.

### 1.4 Email templates and delivery

Password reset and signup confirmation rely on Supabase email. Out of the box
Supabase only sends a couple of messages per hour, which is not enough for
real users.

Dashboard → **Authentication → Emails**:

- Customise the **Reset Password** and **Confirm signup** templates.
- For production, configure **SMTP Settings** with a real provider
  (Resend, Postmark, SendGrid, Amazon SES...). Otherwise users will not get
  their reset links.

If you want to skip email confirmation while testing, turn off
**Confirm email** under Authentication → Providers → Email. Turn it back on
before launch.

---

## Step 2 — Google Cloud OAuth

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose *External*, fill in the
   app name, support email and developer contact. Add the scopes `userinfo.email`
   and `userinfo.profile`. Publish the app (or add test users while in testing).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     - `https://bhldonheosindyolgeom.supabase.co`
     - `https://vault.example.com`
     - `http://localhost:5173`
   - **Authorized redirect URIs**:
     - `https://bhldonheosindyolgeom.supabase.co/auth/v1/callback`
4. Copy the generated **Client ID** and **Client secret** into Supabase
   (Step 1.2).

The redirect URI must point at Supabase, not at your app. Supabase finishes the
OAuth handshake and then redirects to your app.

---

## Step 3 — Deploy to Vercel

### 3.1 Push the code to a Git repository

The project is not a git repository yet. Initialise one and push to GitHub,
GitLab or Bitbucket:

```bash
git init
git add .
git commit -m "Personal Vault"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Make sure `.env.local` is **not** committed. It is already covered by
`.gitignore`; verify with `git status` before pushing.

### 3.2 Import the project in Vercel

1. <https://vercel.com/new> → import the repository.
2. Vercel detects Vite automatically. `vercel.json` in this repo already pins:
   - Build command: `npm run build`
   - Output directory: `dist`
   - SPA rewrite so deep links do not 404
3. **Environment Variables** — add both, for *Production*, *Preview* and
   *Development*:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://bhldonheosindyolgeom.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | your publishable key |

   Vite inlines these at build time, so **changing them requires a redeploy**.
   There is no runtime configuration.

4. Deploy.

### 3.3 Point Supabase at the final domain

After the first successful deploy you have a real domain (for example
`personal-vault.vercel.app`). Go back to Supabase → Authentication → URL
Configuration and make sure that domain is the **Site URL** and is present in
**Redirect URLs**. Then add the same domain to the Google OAuth client's
authorized origins.

---

## Step 4 — Verify after deploy

Run through this list on the deployed URL, ideally in a private window:

- [ ] Sign up with email and password, confirm the email link works.
- [ ] Sign in with Google. A profile row is created automatically.
- [ ] Create the master password on first sign-in.
- [ ] Add a password item with a URL and confirm the site logo appears next to
      the URL field while typing, and on the saved card.
- [ ] Add a bank card and a secure note.
- [ ] Lock and unlock with the master password.
- [ ] Settings → **Enable biometric unlock** → unlock with the fingerprint or
      face prompt after reloading.
- [ ] Sign out, use **Forgot password**, follow the reset link, set a new
      password, and confirm you still unlock the vault with the *master*
      password (they are different secrets).
- [ ] Sign in as a **second account** and confirm it starts empty — no items,
      no avatar, its own master password.
- [ ] Install as a PWA and reload offline to confirm the shell loads.

---

## Notes and gotchas

**Forgot password resets the login, not the vault.** The reset email changes
the Supabase account password. The vault master password is never sent
anywhere and cannot be recovered. If a user forgets it, their vault contents
are unrecoverable by design. The reset screen says this explicitly.

**Biometrics are per device.** Enabling biometric unlock wraps the vault key
with a secret produced by that device's authenticator and stores only the
ciphertext locally. A new device needs the master password once, then can
enrol its own biometrics. Nothing about it is synced.

**WebAuthn + PRF requires a modern browser.** Chrome, Edge and Safari support
the PRF extension; some Firefox configurations do not. When it is unavailable
the Settings panel explains this and the app falls back to the master password.

**Site logos are fetched from the sites themselves.** To avoid leaking the
list of saved sites to a third party, the app requests
`https://<domain>/favicon.ico` (then `/favicon.png`, then
`/apple-touch-icon.png`) directly, with `referrerPolicy="no-referrer"`, and
falls back to a coloured initial. This does mean your browser contacts each
stored domain when the vault is open. If you would rather avoid that entirely,
the fallback initial is already the default when nothing loads.

**Two local folders share one database.** `personal-vault` and
`personal-vault - Copy` both use the same `.env.local`, so both point at the
same Supabase project. Do not run both dev servers at the same time while
testing auth flows — sessions and caches will fight each other.

**Never commit secrets.** `.env.local` holds the publishable key. It is safe
to expose (it is designed for browsers and RLS protects the data), but keep it
out of the repo anyway. Never put the Supabase **service role** key in this
app or in Vercel environment variables.

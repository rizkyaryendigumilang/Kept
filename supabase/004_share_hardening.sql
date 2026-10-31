-- =====================================================================
-- 004_share_hardening.sql: Restrict who can create shared secrets (M-1)
-- =====================================================================
-- Run this in your Supabase SQL Editor.
--
-- Policy-only hardening: no table, column or index is altered. Safe to run
-- on a live database, and safe to re-run (every statement is idempotent).
--
-- What this fixes
--   003 granted `insert` to `anon` with `with check (true)` and a table-level
--   `select` grant to `anon`. That allowed anyone on the internet to:
--     * write unlimited rows with any `sender_id` (forging another user's id,
--       so the real sender could not delete their own share),
--     * store arbitrary blobs / very long expiry, turning the project into
--       free file hosting and burning storage quota,
--     * probe the table directly if any future policy ever permits SELECT.
--
-- The RPC `read_and_burn_secret` is SECURITY DEFINER, so tightening the
-- policies below does not affect reading a share by id.

-- 1. Authenticated shares must belong to the caller -------------------
drop policy if exists shared_secrets_insert on public.shared_secrets;
create policy shared_secrets_insert on public.shared_secrets
for insert to authenticated
with check (
  sender_id = auth.uid()
  and max_views between 1 and 10
  and expires_at > now()
  and expires_at <= now() + interval '30 days'
  and length(ciphertext) between 1 and 200000
  and length(iv) between 1 and 64
  and (salt is null or length(salt) between 1 and 128)
);

-- 2. Anonymous shares: no owner, short-lived, bounded payload ---------
drop policy if exists shared_secrets_insert_anon on public.shared_secrets;
create policy shared_secrets_insert_anon on public.shared_secrets
for insert to anon
with check (
  sender_id is null
  and max_views between 1 and 3
  and expires_at > now()
  and expires_at <= now() + interval '7 days'
  and length(ciphertext) between 1 and 200000
  and length(iv) between 1 and 64
  and (salt is null or length(salt) between 1 and 128)
);

-- 3. Anonymous clients never need direct table reads ------------------
--    (reads go through the SECURITY DEFINER RPC)
revoke select on public.shared_secrets from anon;
revoke update on public.shared_secrets from anon;
revoke delete on public.shared_secrets from anon;

-- 4. Keep only the writes the client actually performs ----------------
revoke all on public.shared_secrets from anon;
grant insert on public.shared_secrets to anon;

revoke insert on public.shared_secrets from authenticated;
revoke update on public.shared_secrets from authenticated;
revoke delete on public.shared_secrets from authenticated;
grant insert, delete on public.shared_secrets to authenticated;

-- Owners may still list their own active shares.
drop policy if exists shared_secrets_select_own on public.shared_secrets;
create policy shared_secrets_select_own on public.shared_secrets
for select to authenticated
using (sender_id = auth.uid());

drop policy if exists shared_secrets_delete_own on public.shared_secrets;
create policy shared_secrets_delete_own on public.shared_secrets
for delete to authenticated
using (sender_id = auth.uid());

-- The RPC stays callable by anyone holding the (unguessable) secret id.
grant execute on function public.read_and_burn_secret(uuid) to anon, authenticated;

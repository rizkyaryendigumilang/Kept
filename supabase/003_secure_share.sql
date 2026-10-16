-- =====================================================================
-- 003_secure_share.sql: Self-Destructing Secure Share for Kept
-- =====================================================================
-- Run this in your Supabase SQL Editor.
-- Zero-knowledge guarantee: Ciphertext is stored on the server, but the
-- decryption key is kept strictly in the URL hash fragment (#key=...)
-- and NEVER touches the server.

create table if not exists public.shared_secrets (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  title text,
  ciphertext text not null,
  iv text not null,
  salt text,
  has_pin boolean not null default false,
  max_views int not null default 1,
  view_count int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_secrets_expires on public.shared_secrets(expires_at);

alter table public.shared_secrets enable row level security;

-- Authenticated users can create new shares
drop policy if exists shared_secrets_insert on public.shared_secrets;
create policy shared_secrets_insert on public.shared_secrets
for insert to authenticated
with check (true);

-- Allow anonymous or authenticated to insert if desired
drop policy if exists shared_secrets_insert_anon on public.shared_secrets;
create policy shared_secrets_insert_anon on public.shared_secrets
for insert to anon
with check (true);

-- Sender can view and delete their own shares
drop policy if exists shared_secrets_select_own on public.shared_secrets;
create policy shared_secrets_select_own on public.shared_secrets
for select to authenticated
using (sender_id = auth.uid());

drop policy if exists shared_secrets_delete_own on public.shared_secrets;
create policy shared_secrets_delete_own on public.shared_secrets
for delete to authenticated
using (sender_id = auth.uid());

-- Atomic procedure to read and burn/increment view count (callable by anyone with secret_id)
create or replace function public.read_and_burn_secret(p_secret_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_secret record;
  v_result jsonb;
begin
  -- Select row with row-level lock
  select * into v_secret
  from public.shared_secrets
  where id = p_secret_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'Secret not found or already burned.');
  end if;

  if now() > v_secret.expires_at then
    delete from public.shared_secrets where id = p_secret_id;
    return jsonb_build_object('status', 'expired', 'message', 'This secret has expired.');
  end if;

  if v_secret.view_count >= v_secret.max_views then
    delete from public.shared_secrets where id = p_secret_id;
    return jsonb_build_object('status', 'burned', 'message', 'This secret has reached its view limit.');
  end if;

  -- Build result payload
  v_result := jsonb_build_object(
    'status', 'ok',
    'id', v_secret.id,
    'title', v_secret.title,
    'ciphertext', v_secret.ciphertext,
    'iv', v_secret.iv,
    'salt', v_secret.salt,
    'has_pin', v_secret.has_pin,
    'max_views', v_secret.max_views,
    'view_count', v_secret.view_count + 1,
    'views_remaining', v_secret.max_views - (v_secret.view_count + 1),
    'expires_at', v_secret.expires_at
  );

  -- Burn immediately if max_views reached
  if (v_secret.view_count + 1) >= v_secret.max_views then
    delete from public.shared_secrets where id = p_secret_id;
  else
    update public.shared_secrets
    set view_count = view_count + 1
    where id = p_secret_id;
  end if;

  return v_result;
end;
$$;

-- Allow public access to execute read_and_burn_secret
grant execute on function public.read_and_burn_secret(uuid) to anon, authenticated;
grant select, insert on public.shared_secrets to anon, authenticated;

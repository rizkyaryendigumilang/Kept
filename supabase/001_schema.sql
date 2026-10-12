create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'You',
  avatar_url text,
  vault_salt text,
  vault_verifier jsonb,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  card_style text not null default 'realistic' check (card_style in ('realistic','abstract')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('password','bank_card','secure_note')),
  category text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vault_items_user_updated on public.vault_items(user_id, updated_at desc);
create index if not exists idx_vault_items_user_type on public.vault_items(user_id, item_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists vault_items_set_updated_at on public.vault_items;
create trigger vault_items_set_updated_at
before update on public.vault_items
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.vault_items enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists vault_items_select_own on public.vault_items;
create policy vault_items_select_own on public.vault_items
for select to authenticated
using (user_id = auth.uid());

drop policy if exists vault_items_insert_own on public.vault_items;
create policy vault_items_insert_own on public.vault_items
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists vault_items_update_own on public.vault_items;
create policy vault_items_update_own on public.vault_items
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists vault_items_delete_own on public.vault_items;
create policy vault_items_delete_own on public.vault_items
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'You'), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Supabase Data API privileges for browser client.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.vault_items to authenticated;

-- =====================================================================
-- 005_add_document_item_type.sql: Allow 'document' item_type in vault_items
-- =====================================================================
-- Run this in your Supabase SQL Editor for live or existing databases.
-- Updates the check constraint to permit official documents ('document').

alter table public.vault_items
  drop constraint if exists vault_items_item_type_check;

alter table public.vault_items
  add constraint vault_items_item_type_check
  check (item_type in ('password','bank_card','secure_note','document'));

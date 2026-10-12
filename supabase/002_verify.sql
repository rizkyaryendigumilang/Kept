-- Run after 001_schema.sql.
select table_name, row_security
from information_schema.tables
where table_schema = 'public' and table_name in ('profiles','vault_items')
order by table_name;

select policyname, tablename, cmd
from pg_policies
where schemaname = 'public' and tablename in ('profiles','vault_items')
order by tablename, policyname;

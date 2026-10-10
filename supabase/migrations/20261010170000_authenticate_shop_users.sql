-- Single-shop access model:
-- - Authenticated users must also have a row in public.shop_users.
-- - All allowlisted staff share the same shop data.
-- - Existing policies on these four tables are replaced deliberately so a
--   permissive anon policy cannot remain active alongside the new policies.
-- Review the current policies and take a database backup before applying.

begin;

create table if not exists public.shop_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Fail closed if the application's existing data tables are not present.
do $$
declare
  v_table text;
  v_policy record;
begin
  foreach v_table in array array['parts', 'orders', 'order_lines', 'shop_users'] loop
    if to_regclass(format('%I.%I', 'public', v_table)) is null then
      raise exception 'Required table public.% is missing; create the application schema before applying this migration', v_table;
    end if;
  end loop;

  -- Replace existing policies on these app tables. The new model is for one
  -- shop where every explicitly allowlisted staff account shares the data.
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('parts', 'orders', 'order_lines', 'shop_users')
  loop
    execute format('drop policy %I on %I.%I', v_policy.policyname, v_policy.schemaname, v_policy.tablename);
  end loop;
end $$;

alter table public.parts enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.shop_users enable row level security;

-- Remove direct table privileges from anon/PUBLIC. Authenticated staff receive
-- CRUD on the shop tables, constrained by the policies below.
revoke all on table public.parts, public.orders, public.order_lines, public.shop_users from anon, public;
grant select, insert, update, delete on table public.parts, public.orders, public.order_lines to authenticated;
revoke all on table public.shop_users from authenticated;
grant select on table public.shop_users to authenticated;

create policy shop_user_can_read_own_allowlist_row
  on public.shop_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy allowlisted_staff_access
  on public.parts
  for all
  to authenticated
  using (exists (select 1 from public.shop_users su where su.user_id = (select auth.uid())))
  with check (exists (select 1 from public.shop_users su where su.user_id = (select auth.uid())));

create policy allowlisted_staff_access
  on public.orders
  for all
  to authenticated
  using (exists (select 1 from public.shop_users su where su.user_id = (select auth.uid())))
  with check (exists (select 1 from public.shop_users su where su.user_id = (select auth.uid())));

create policy allowlisted_staff_access
  on public.order_lines
  for all
  to authenticated
  using (exists (select 1 from public.shop_users su where su.user_id = (select auth.uid())))
  with check (exists (select 1 from public.shop_users su where su.user_id = (select auth.uid())));

commit;

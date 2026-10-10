-- Serialize initial product seeding so concurrent app sessions cannot insert
-- the defaults more than once. Existing non-empty catalogs are left untouched.
begin;

create or replace function public.seed_default_parts_if_empty(p_parts jsonb)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_part jsonb;
  v_name text;
  v_retail_price numeric;
  v_diy_price numeric;
  v_wholesale_price numeric;
  v_inserted integer;
begin
  if p_parts is null or jsonb_typeof(p_parts) <> 'array' then
    raise exception using errcode = '22023', message = 'Seed list must be a JSON array';
  end if;
  if jsonb_array_length(p_parts) = 0 or jsonb_array_length(p_parts) > 100 then
    raise exception using errcode = '22023', message = 'Seed list must contain between 1 and 100 products';
  end if;

  -- The transaction-scoped advisory lock makes the empty-check and insert atomic
  -- even when several staff devices load an empty catalog at the same time.
  perform pg_advisory_xact_lock(192736451, 4222);

  if exists (select 1 from public.parts limit 1) then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_parts) as item(value)
    group by lower(btrim(item.value ->> 'name'))
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Seed list contains duplicate product names';
  end if;

  for v_part in select value from jsonb_array_elements(p_parts) as item(value) loop
    v_name := nullif(btrim(v_part ->> 'name'), '');
    v_retail_price := nullif(v_part ->> 'retail_price', '')::numeric;
    v_diy_price := nullif(v_part ->> 'diy_price', '')::numeric;
    v_wholesale_price := nullif(v_part ->> 'wholesale_price', '')::numeric;

    if v_name is null or v_retail_price is null or v_diy_price is null or v_wholesale_price is null then
      raise exception using errcode = '22023', message = 'Each seed product needs a name and all three prices';
    end if;
    if v_retail_price < 0 or v_diy_price < 0 or v_wholesale_price < 0 then
      raise exception using errcode = '22023', message = 'Seed prices must be nonnegative';
    end if;
  end loop;

  insert into public.parts (name, retail_price, diy_price, wholesale_price)
  select
    btrim(item.value ->> 'name'),
    (item.value ->> 'retail_price')::numeric,
    (item.value ->> 'diy_price')::numeric,
    (item.value ->> 'wholesale_price')::numeric
  from jsonb_array_elements(p_parts) as item(value);

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

revoke all on function public.seed_default_parts_if_empty(jsonb) from public, anon;
grant execute on function public.seed_default_parts_if_empty(jsonb) to authenticated;

commit;

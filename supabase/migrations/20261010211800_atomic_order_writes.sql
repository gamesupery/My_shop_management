-- Keep order headers and lines consistent: each RPC runs in one database transaction.
-- Existing production data was checked before adding these constraints; no rows
-- currently violate the order/line checks. Do not enforce payment <= total yet:
-- one historical order is overpaid, so the shop's refund/credit rule needs review.

begin;

alter table public.orders
  add constraint orders_customer_type_valid
  check (cust_type is not null and cust_type in ('retail', 'diy', 'wholesale')) not valid,
  add constraint orders_total_nonnegative
  check (total is not null and total >= 0) not valid,
  add constraint orders_paid_amount_nonnegative
  check (paid_amount is not null and paid_amount >= 0) not valid;

alter table public.order_lines
  add constraint order_lines_qty_positive
  check (qty is not null and qty > 0) not valid,
  add constraint order_lines_unit_price_nonnegative
  check (unit_price is not null and unit_price >= 0) not valid,
  add constraint order_lines_total_nonnegative
  check (total is not null and total >= 0) not valid;

alter table public.orders validate constraint orders_customer_type_valid;
alter table public.orders validate constraint orders_total_nonnegative;
alter table public.orders validate constraint orders_paid_amount_nonnegative;
alter table public.order_lines validate constraint order_lines_qty_positive;
alter table public.order_lines validate constraint order_lines_unit_price_nonnegative;
alter table public.order_lines validate constraint order_lines_total_nonnegative;

create or replace function public.create_order_atomic(
  p_cust_type text,
  p_cust_name text,
  p_bike_brand text,
  p_paid_amount numeric,
  p_lines jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order_id bigint;
  v_total numeric := 0;
  v_paid_amount numeric;
  v_line jsonb;
  v_part_name text;
  v_qty integer;
  v_unit_price numeric;
begin
  if p_cust_type is null or p_cust_type not in ('retail', 'diy', 'wholesale') then
    raise exception using errcode = '22023', message = 'Invalid customer type';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception using errcode = '22023', message = 'At least one order line is required';
  end if;

  for v_line in select value from jsonb_array_elements(p_lines) as items(value) loop
    v_part_name := nullif(btrim(v_line ->> 'partName'), '');
    v_qty := nullif(v_line ->> 'qty', '')::integer;
    v_unit_price := nullif(v_line ->> 'unitPrice', '')::numeric;

    if v_part_name is null then
      raise exception using errcode = '22023', message = 'Order line needs a product name';
    end if;
    if v_qty is null or v_qty < 1 then
      raise exception using errcode = '22023', message = 'Quantity must be a positive integer';
    end if;
    if v_unit_price is null or v_unit_price < 0 then
      raise exception using errcode = '22023', message = 'Unit price must be nonnegative';
    end if;

    v_total := v_total + round(v_qty * v_unit_price, 2);
  end loop;

  v_total := round(v_total, 2);
  v_paid_amount := round(coalesce(p_paid_amount, 0), 2);
  if v_paid_amount < 0 then
    raise exception using errcode = '22023', message = 'Paid amount must be nonnegative';
  end if;

  insert into public.orders (cust_type, cust_name, bike_brand, total, paid_amount)
  values (
    p_cust_type,
    coalesce(nullif(btrim(p_cust_name), ''), '—'),
    coalesce(nullif(btrim(p_bike_brand), ''), '—'),
    v_total,
    v_paid_amount
  )
  returning id into v_order_id;

  insert into public.order_lines (order_id, part_name, qty, unit_price, total, note)
  select
    v_order_id,
    btrim(item.value ->> 'partName'),
    (item.value ->> 'qty')::integer,
    round((item.value ->> 'unitPrice')::numeric, 2),
    round((item.value ->> 'qty')::numeric * (item.value ->> 'unitPrice')::numeric, 2),
    nullif(btrim(item.value ->> 'note'), '')
  from jsonb_array_elements(p_lines) as item(value);

  return v_order_id;
end;
$$;

create or replace function public.update_order_atomic(
  p_order_id bigint,
  p_cust_type text,
  p_cust_name text,
  p_bike_brand text,
  p_paid_amount numeric,
  p_lines jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_total numeric := 0;
  v_paid_amount numeric;
  v_line jsonb;
  v_part_name text;
  v_qty integer;
  v_unit_price numeric;
begin
  if p_order_id is null then
    raise exception using errcode = '22023', message = 'Order id is required';
  end if;
  if p_cust_type is null or p_cust_type not in ('retail', 'diy', 'wholesale') then
    raise exception using errcode = '22023', message = 'Invalid customer type';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception using errcode = '22023', message = 'At least one order line is required';
  end if;

  for v_line in select value from jsonb_array_elements(p_lines) as items(value) loop
    v_part_name := nullif(btrim(v_line ->> 'partName'), '');
    v_qty := nullif(v_line ->> 'qty', '')::integer;
    v_unit_price := nullif(v_line ->> 'unitPrice', '')::numeric;

    if v_part_name is null then
      raise exception using errcode = '22023', message = 'Order line needs a product name';
    end if;
    if v_qty is null or v_qty < 1 then
      raise exception using errcode = '22023', message = 'Quantity must be a positive integer';
    end if;
    if v_unit_price is null or v_unit_price < 0 then
      raise exception using errcode = '22023', message = 'Unit price must be nonnegative';
    end if;

    v_total := v_total + round(v_qty * v_unit_price, 2);
  end loop;

  v_total := round(v_total, 2);
  v_paid_amount := round(coalesce(p_paid_amount, 0), 2);
  if v_paid_amount < 0 then
    raise exception using errcode = '22023', message = 'Paid amount must be nonnegative';
  end if;

  update public.orders
  set cust_type = p_cust_type,
      cust_name = coalesce(nullif(btrim(p_cust_name), ''), '—'),
      bike_brand = coalesce(nullif(btrim(p_bike_brand), ''), '—'),
      total = v_total,
      paid_amount = v_paid_amount
  where id = p_order_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Order not found or access denied';
  end if;

  delete from public.order_lines where order_id = p_order_id;
  insert into public.order_lines (order_id, part_name, qty, unit_price, total, note)
  select
    p_order_id,
    btrim(item.value ->> 'partName'),
    (item.value ->> 'qty')::integer,
    round((item.value ->> 'unitPrice')::numeric, 2),
    round((item.value ->> 'qty')::numeric * (item.value ->> 'unitPrice')::numeric, 2),
    nullif(btrim(item.value ->> 'note'), '')
  from jsonb_array_elements(p_lines) as item(value);
end;
$$;

revoke all on function public.create_order_atomic(text, text, text, numeric, jsonb) from public, anon;
revoke all on function public.update_order_atomic(bigint, text, text, text, numeric, jsonb) from public, anon;
grant execute on function public.create_order_atomic(text, text, text, numeric, jsonb) to authenticated;
grant execute on function public.update_order_atomic(bigint, text, text, text, numeric, jsonb) to authenticated;

commit;

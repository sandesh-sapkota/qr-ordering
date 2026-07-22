-- Secure place_order: optional staff attribution + admin-only waiter_pos.
-- Drop legacy 4-arg overload so PostgREST resolves a single function.
DROP FUNCTION IF EXISTS public.place_order(uuid, uuid, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.place_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_total_amount numeric,
  p_items jsonb,
  p_order_source varchar DEFAULT 'qr_code',
  p_created_by_staff_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare
  v_order_id uuid;
  v_order_source varchar := coalesce(nullif(trim(p_order_source), ''), 'qr_code');
begin
  if v_order_source not in ('qr_code', 'waiter_pos') then
    raise exception 'invalid order_source: %', v_order_source;
  end if;

  if v_order_source = 'waiter_pos' then
    if p_created_by_staff_id is null then
      raise exception 'created_by_staff_id is required for waiter_pos orders';
    end if;

    if not public.is_admin_of(p_restaurant_id) then
      raise exception 'not authorized to place waiter_pos orders';
    end if;

    if not exists (
      select 1
      from public.staff_members sm
      where sm.id = p_created_by_staff_id
        and sm.restaurant_id = p_restaurant_id
        and sm.is_active = true
    ) then
      raise exception 'invalid or inactive staff member for restaurant';
    end if;
  elsif p_created_by_staff_id is not null then
    raise exception 'created_by_staff_id is only allowed for waiter_pos orders';
  end if;

  insert into public.orders (
    restaurant_id,
    table_id,
    status,
    total_amount,
    order_source,
    created_by_staff_id,
    payment_status
  )
  values (
    p_restaurant_id,
    p_table_id,
    'pending',
    p_total_amount,
    v_order_source,
    p_created_by_staff_id,
    'unpaid'
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, menu_item_id, quantity, price_at_order_time, notes)
  select
    v_order_id,
    (item->>'menu_item_id')::uuid,
    (item->>'quantity')::int,
    (item->>'price_at_order_time')::numeric,
    item->>'notes'
  from jsonb_array_elements(p_items) as item;

  return v_order_id;
end;
$function$;

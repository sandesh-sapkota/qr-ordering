-- Phase 2 Step 1: staff_members, menu_item_variants, orders scale columns
-- Already applied remotely as: phase2_staff_variants_order_columns

-- 1. Floor-staff role enum
CREATE TYPE public.staff_role AS ENUM ('owner', 'manager', 'waiter', 'kitchen');

-- 2. Floor staff (PIN-based POS switching)
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  auth_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  name text NOT NULL,
  role public.staff_role NOT NULL,
  passcode_pin text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_members_restaurant_id_idx
  ON public.staff_members (restaurant_id);

CREATE INDEX staff_members_auth_user_id_idx
  ON public.staff_members (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 3. Menu item variants (half/full, steamed/fried, etc.)
CREATE TABLE public.menu_item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
  name text NOT NULL,
  price_override numeric(10, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX menu_item_variants_menu_item_id_idx
  ON public.menu_item_variants (menu_item_id);

-- 4. Orders: staff attribution, source, payment tracking
ALTER TABLE public.orders
  ADD COLUMN created_by_staff_id uuid NULL
    REFERENCES public.staff_members (id) ON DELETE SET NULL,
  ADD COLUMN order_source varchar NOT NULL DEFAULT 'qr_code',
  ADD COLUMN payment_status varchar NOT NULL DEFAULT 'unpaid',
  ADD COLUMN payment_method varchar NULL;

CREATE INDEX orders_created_by_staff_id_idx
  ON public.orders (created_by_staff_id)
  WHERE created_by_staff_id IS NOT NULL;

CREATE INDEX orders_order_source_idx
  ON public.orders (restaurant_id, order_source);

-- 5. RLS — staff_members (tenant-scoped via restaurant_id)
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_members_admin_select
  ON public.staff_members
  FOR SELECT
  USING (is_admin_of(restaurant_id));

CREATE POLICY staff_members_admin_insert
  ON public.staff_members
  FOR INSERT
  WITH CHECK (is_admin_of(restaurant_id));

CREATE POLICY staff_members_admin_update
  ON public.staff_members
  FOR UPDATE
  USING (is_admin_of(restaurant_id))
  WITH CHECK (is_admin_of(restaurant_id));

CREATE POLICY staff_members_platform_admin_all
  ON public.staff_members
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- 6. RLS — menu_item_variants (tenant via parent menu_items.restaurant_id)
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_item_variants_admin_select
  ON public.menu_item_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND is_admin_of(mi.restaurant_id)
    )
  );

CREATE POLICY menu_item_variants_admin_insert
  ON public.menu_item_variants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND is_admin_of(mi.restaurant_id)
    )
  );

CREATE POLICY menu_item_variants_admin_update
  ON public.menu_item_variants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND is_admin_of(mi.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND is_admin_of(mi.restaurant_id)
    )
  );

-- Public read so customer QR menus can load variants (matches menu_items pattern).
CREATE POLICY menu_item_variants_public_read
  ON public.menu_item_variants
  FOR SELECT
  USING (true);

CREATE POLICY menu_item_variants_platform_admin_all
  ON public.menu_item_variants
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

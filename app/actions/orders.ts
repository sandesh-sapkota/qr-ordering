"use server";

import { createClient } from "@/lib/supabase/server";

export type OrderSource = "qr_code" | "waiter_pos";

export type PlaceOrderItemInput = {
  menuItemId: string;
  quantity: number;
  notes?: string;
  /** Selected menu_item_options ids — prices recomputed server-side. */
  optionIds?: string[];
  /** Optional menu_item_variants id — uses price_override when set. */
  variantId?: string;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

type QrTableRef = {
  slug: string;
  token: string;
};

type ExplicitTableRef = {
  restaurantId: string;
  tableId: string;
};

export type PlaceOrderInput = {
  items: PlaceOrderItemInput[];
  /** Floor staff placing a waiter POS order. Implies order_source = waiter_pos. */
  staffId?: string;
  /** Defaults to qr_code; must be waiter_pos when staffId is set. */
  orderSource?: OrderSource;
} & (QrTableRef | ExplicitTableRef);

function isQrRef(input: PlaceOrderInput): input is PlaceOrderInput & QrTableRef {
  return "slug" in input && "token" in input;
}

function validateItems(
  items: PlaceOrderItemInput[],
): { ok: true } | { ok: false; error: string } {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.some(
      (i) =>
        typeof i.menuItemId !== "string" ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 99 ||
        (i.notes !== undefined &&
          (typeof i.notes !== "string" || i.notes.length > 200)) ||
        (i.optionIds !== undefined &&
          (!Array.isArray(i.optionIds) ||
            i.optionIds.some((id) => typeof id !== "string"))) ||
        (i.variantId !== undefined && typeof i.variantId !== "string"),
    )
  ) {
    return { ok: false, error: "Your cart is invalid. Please try again." };
  }
  return { ok: true };
}

/**
 * Places an order with server-side price recalculation.
 * - QR customers: pass `slug` + `token` (defaults to order_source = qr_code).
 * - Staff POS: pass `restaurantId` + `tableId` + `staffId` (order_source = waiter_pos).
 * Client-supplied totals are never trusted.
 */
export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const itemsCheck = validateItems(input.items);
  if (!itemsCheck.ok) return itemsCheck;

  const items = input.items;
  const supabase = await createClient();

  let restaurantId: string;
  let tableId: string;

  if (isQrRef(input)) {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", input.slug)
      .single();

    if (!restaurant) {
      return { ok: false, error: "Restaurant not found." };
    }

    const { data: table } = await supabase
      .from("tables")
      .select("id")
      .eq("qr_token", input.token)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (!table) {
      return { ok: false, error: "This table's QR code is not valid." };
    }

    restaurantId = restaurant.id;
    tableId = table.id;
  } else {
    if (
      typeof input.restaurantId !== "string" ||
      typeof input.tableId !== "string"
    ) {
      return { ok: false, error: "Restaurant and table are required." };
    }

    const { data: table } = await supabase
      .from("tables")
      .select("id, restaurant_id")
      .eq("id", input.tableId)
      .eq("restaurant_id", input.restaurantId)
      .single();

    if (!table) {
      return { ok: false, error: "Table not found for this restaurant." };
    }

    restaurantId = table.restaurant_id;
    tableId = table.id;
  }

  const staffId = input.staffId;
  let orderSource: OrderSource = input.orderSource ?? "qr_code";

  if (staffId) {
    orderSource = "waiter_pos";
  }

  if (orderSource === "waiter_pos" && !staffId) {
    return {
      ok: false,
      error: "Staff member is required for waiter POS orders.",
    };
  }

  // Staff / waiter_pos orders require an authenticated admin of this restaurant.
  // Anonymous QR callers cannot spoof waiter_pos attribution.
  if (orderSource === "waiter_pos") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Unauthorized." };
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("restaurant_id")
      .eq("id", user.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!admin) {
      return { ok: false, error: "Unauthorized." };
    }

    const { data: staff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("id", staffId!)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) {
      return {
        ok: false,
        error: "Staff member is invalid or inactive for this restaurant.",
      };
    }
  }

  // Re-fetch prices server-side — the client never sends prices.
  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, price, is_available")
    .eq("restaurant_id", restaurantId)
    .in("id", menuItemIds);

  const priceById = new Map(
    (menuItems ?? [])
      .filter((m) => m.is_available)
      .map((m) => [m.id, Number(m.price)]),
  );

  if (items.some((i) => !priceById.has(i.menuItemId))) {
    return {
      ok: false,
      error:
        "Some items in your cart are no longer available. Please review your cart.",
    };
  }

  // Variant price overrides (tenant-scoped via parent menu_items.restaurant_id).
  const variantIds = [
    ...new Set(
      items
        .map((i) => i.variantId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const variantById = new Map<
    string,
    { menuItemId: string; priceOverride: number }
  >();

  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("menu_item_variants")
      .select("id, menu_item_id, price_override")
      .in("id", variantIds);

    const candidateVariants = variants ?? [];
    if (candidateVariants.length > 0) {
      const parentItemIds = [
        ...new Set(candidateVariants.map((v) => v.menu_item_id)),
      ];
      const { data: parentItems } = await supabase
        .from("menu_items")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .in("id", parentItemIds);

      const allowedItemIds = new Set((parentItems ?? []).map((m) => m.id));

      for (const v of candidateVariants) {
        if (!allowedItemIds.has(v.menu_item_id)) continue;
        variantById.set(v.id, {
          menuItemId: v.menu_item_id,
          priceOverride: Number(v.price_override),
        });
      }
    }

    if (
      items.some(
        (i) =>
          i.variantId &&
          (!variantById.has(i.variantId) ||
            variantById.get(i.variantId)!.menuItemId !== i.menuItemId),
      )
    ) {
      return {
        ok: false,
        error:
          "Some selected variants are no longer valid. Please review your cart.",
      };
    }
  }

  const { data: optionGroups } = await supabase
    .from("menu_item_option_groups")
    .select("id, menu_item_id, selection_type, is_required")
    .eq("restaurant_id", restaurantId)
    .in("menu_item_id", menuItemIds);

  const groupsByItem = new Map<
    string,
    {
      id: string;
      selection_type: string;
      is_required: boolean;
    }[]
  >();
  for (const g of optionGroups ?? []) {
    const list = groupsByItem.get(g.menu_item_id) ?? [];
    list.push(g);
    groupsByItem.set(g.menu_item_id, list);
  }

  const allGroupIds = (optionGroups ?? []).map((g) => g.id);
  const { data: allOptions } =
    allGroupIds.length > 0
      ? await supabase
          .from("menu_item_options")
          .select("id, group_id, price_adjustment")
          .eq("restaurant_id", restaurantId)
          .in("group_id", allGroupIds)
      : {
          data: [] as {
            id: string;
            group_id: string;
            price_adjustment: number;
          }[],
        };

  const optionById = new Map(
    (allOptions ?? []).map((o) => [
      o.id,
      { groupId: o.group_id, priceAdjustment: Number(o.price_adjustment) },
    ]),
  );

  const groupToItem = new Map(
    (optionGroups ?? []).map((g) => [g.id, g.menu_item_id]),
  );

  const unitPriceByLine: number[] = [];

  for (const line of items) {
    const variant = line.variantId ? variantById.get(line.variantId) : undefined;
    const base = variant
      ? variant.priceOverride
      : priceById.get(line.menuItemId)!;

    const groups = groupsByItem.get(line.menuItemId) ?? [];
    const selectedIds = line.optionIds ?? [];
    const selected = selectedIds.map((id) => {
      const opt = optionById.get(id);
      if (!opt || groupToItem.get(opt.groupId) !== line.menuItemId) {
        return null;
      }
      return { id, ...opt };
    });

    if (selected.some((s) => s === null)) {
      return {
        ok: false,
        error:
          "Some selected options are no longer valid. Please review your cart.",
      };
    }

    const selectedValid = selected as {
      id: string;
      groupId: string;
      priceAdjustment: number;
    }[];

    for (const group of groups) {
      const picks = selectedValid.filter((s) => s.groupId === group.id);
      if (group.is_required && picks.length === 0) {
        return {
          ok: false,
          error: "Please complete required options for all items.",
        };
      }
      if (group.selection_type === "single" && picks.length > 1) {
        return {
          ok: false,
          error: "Your cart has invalid option selections.",
        };
      }
    }

    const allowedGroupIds = new Set(groups.map((g) => g.id));
    if (selectedValid.some((s) => !allowedGroupIds.has(s.groupId))) {
      return {
        ok: false,
        error:
          "Some selected options are no longer valid. Please review your cart.",
      };
    }

    const adjustment = selectedValid.reduce(
      (sum, s) => sum + s.priceAdjustment,
      0,
    );
    unitPriceByLine.push(Math.max(0, base + adjustment));
  }

  // Sum in paisa (integer) to avoid floating-point drift on money.
  const totalPaisa = items.reduce(
    (sum, i, idx) =>
      sum + Math.round(unitPriceByLine[idx] * 100) * i.quantity,
    0,
  );

  const { data: orderId, error: orderError } = await supabase.rpc(
    "place_order",
    {
      p_restaurant_id: restaurantId,
      p_table_id: tableId,
      p_total_amount: totalPaisa / 100,
      p_order_source: orderSource,
      p_created_by_staff_id: staffId ?? null,
      p_items: items.map((i, idx) => ({
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        price_at_order_time: unitPriceByLine[idx],
        notes: i.notes?.trim() || null,
      })),
    },
  );

  if (orderError || !orderId) {
    return { ok: false, error: "Could not place your order. Please try again." };
  }

  return { ok: true, orderId };
}

"use server";

import { createClient } from "@/lib/supabase/server";

type CartItemInput = {
  menuItemId: string;
  quantity: number;
  notes?: string;
  /** Selected menu_item_options ids — prices recomputed server-side. */
  optionIds?: string[];
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function placeOrder(input: {
  slug: string;
  token: string;
  items: CartItemInput[];
}): Promise<PlaceOrderResult> {
  const { slug, token, items } = input;

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
            i.optionIds.some((id) => typeof id !== "string"))),
    )
  ) {
    return { ok: false, error: "Your cart is invalid. Please try again." };
  }

  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!restaurant) {
    return { ok: false, error: "Restaurant not found." };
  }

  const { data: table } = await supabase
    .from("tables")
    .select("id")
    .eq("qr_token", token)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!table) {
    return { ok: false, error: "This table's QR code is not valid." };
  }

  // Re-fetch prices server-side — the client never sends prices, so it
  // can't tamper with them. Unavailable items are rejected, not skipped.
  const menuItemIds = items.map((i) => i.menuItemId);
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, price, is_available")
    .eq("restaurant_id", restaurant.id)
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

  const { data: optionGroups } = await supabase
    .from("menu_item_option_groups")
    .select("id, menu_item_id, selection_type, is_required")
    .eq("restaurant_id", restaurant.id)
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
          .eq("restaurant_id", restaurant.id)
          .in("group_id", allGroupIds)
      : { data: [] as { id: string; group_id: string; price_adjustment: number }[] };

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
    const base = priceById.get(line.menuItemId)!;
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

    // Reject selections that don't belong to any known group for this item
    // (already covered) and options for groups that no longer exist.
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

  // Insert the order and its items in a single DB transaction (via RPC) so
  // Realtime only notifies admins once both are fully committed — doing this
  // as two separate inserts let the admin dashboard's Realtime-triggered
  // refetch occasionally beat the order_items insert to the database.
  const { data: orderId, error: orderError } = await supabase.rpc(
    "place_order",
    {
      p_restaurant_id: restaurant.id,
      p_table_id: table.id,
      p_total_amount: totalPaisa / 100,
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

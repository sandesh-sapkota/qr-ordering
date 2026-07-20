"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

type CartItemInput = {
  menuItemId: string;
  quantity: number;
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
        i.quantity > 99,
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

  // Sum in paisa (integer) to avoid floating-point drift on money.
  const totalPaisa = items.reduce(
    (sum, i) => sum + Math.round(priceById.get(i.menuItemId)! * 100) * i.quantity,
    0,
  );

  // Generate the id here instead of reading it back with .select() — the
  // anon SELECT policy only covers recent orders, so don't depend on it here.
  const orderId = randomUUID();

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    restaurant_id: restaurant.id,
    table_id: table.id,
    status: "pending",
    total_amount: totalPaisa / 100,
  });

  if (orderError) {
    return { ok: false, error: "Could not place your order. Please try again." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: orderId,
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      price_at_order_time: priceById.get(i.menuItemId)!,
    })),
  );

  if (itemsError) {
    return { ok: false, error: "Could not place your order. Please try again." };
  }

  return { ok: true, orderId };
}

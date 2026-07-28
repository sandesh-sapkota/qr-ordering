"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";

export type BumpKitchenOrderResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Advances a preparing kitchen ticket to `served`, removing it from the KDS.
 * Scoped to the signed-in admin's restaurant.
 */
export async function bumpKitchenOrder(
  orderId: string,
): Promise<BumpKitchenOrderResult> {
  if (typeof orderId !== "string" || !orderId) {
    return { ok: false, error: "Invalid order." };
  }

  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Unauthorized." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "served" })
    .eq("id", orderId)
    .eq("restaurant_id", ctx.admin.restaurant_id)
    .eq("status", "preparing")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Could not bump order. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Order not found or already served." };
  }

  return { ok: true };
}

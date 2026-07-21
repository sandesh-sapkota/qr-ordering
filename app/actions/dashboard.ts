"use server";

import { createClient } from "@/lib/supabase/server";

const ORDER_SELECT =
  "id, status, total_amount, created_at, updated_at, tables(table_number), order_items(id, quantity, menu_items(name))";

export type CompletedOrderRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  tables: { table_number: string } | null;
  order_items: {
    id: string;
    quantity: number;
    menu_items: { name: string } | null;
  }[];
};

/**
 * Fetches completed orders for the signed-in admin's restaurant within a
 * local-day window. `startOfDay` / `endOfDay` must be ISO strings computed
 * on the client so the restaurant's timezone is respected.
 */
export async function fetchCompletedOrders(
  startOfDay: string,
  endOfDay: string,
): Promise<{ orders: CompletedOrderRow[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { orders: [], error: "Unauthorized" };

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("restaurant_id")
      .eq("id", user.id)
      .single();

    if (!adminUser) return { orders: [], error: "Admin user not found" };

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", adminUser.restaurant_id)
      .eq("status", "completed")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false });

    if (error) return { orders: [], error: error.message };

    return {
      orders: (data ?? []) as unknown as CompletedOrderRow[],
      error: null,
    };
  } catch (e) {
    return {
      orders: [],
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

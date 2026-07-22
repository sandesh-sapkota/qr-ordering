import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import OrdersClient, { type Order } from "./OrdersClient";
import PasswordResetToast from "./PasswordResetToast";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ password_reset?: string }>;
}) {
  const { password_reset } = await searchParams;
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();

  // Live board: only the last 24h — older completed orders don't belong here.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, created_at, updated_at, tables(table_number), order_items(id, quantity, price_at_order_time, notes, menu_items(name))",
    )
    .eq("restaurant_id", ctx.admin.restaurant_id)
    .in("status", ["pending", "preparing", "served", "completed"])
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  return (
    <>
      {password_reset === "1" && <PasswordResetToast />}
      <OrdersClient
        restaurantId={ctx.admin.restaurant_id}
        initialOrders={(orders ?? []) as unknown as Order[]}
      />
    </>
  );
}

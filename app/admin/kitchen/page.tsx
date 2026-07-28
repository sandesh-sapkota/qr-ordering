import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import KitchenClient, { type KitchenOrder } from "./KitchenClient";

export default async function KitchenPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, updated_at, tables(table_number), order_items(id, quantity, notes, menu_items(name))",
    )
    .eq("restaurant_id", ctx.admin.restaurant_id)
    .eq("status", "preparing")
    .order("created_at", { ascending: true });

  return (
    <KitchenClient
      restaurantId={ctx.admin.restaurant_id}
      restaurantName={ctx.admin.restaurants?.name ?? "Kitchen"}
      initialOrders={(orders ?? []) as unknown as KitchenOrder[]}
    />
  );
}

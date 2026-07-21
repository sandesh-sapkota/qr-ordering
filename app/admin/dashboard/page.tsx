import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient, { type DashboardOrder } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!adminUser) redirect("/admin/login");

  // Fetch the last 48h so the client can derive both the local calendar day
  // and the prior local day for vs-yesterday comparisons. The server can't
  // know the restaurant's timezone; 48h always covers today + yesterday.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, created_at, updated_at, tables(table_number), order_items(id, quantity, menu_items(name))",
    )
    .eq("restaurant_id", adminUser.restaurant_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient initialOrders={(orders ?? []) as unknown as DashboardOrder[]} />
  );
}

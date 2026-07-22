import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import TablesClient from "./TablesClient";

export default async function TablesPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const slug = ctx.admin.restaurants?.slug ?? "";

  const { data: tables } = await supabase
    .from("tables")
    .select("id, table_number, qr_token, created_at")
    .eq("restaurant_id", ctx.admin.restaurant_id)
    .order("created_at");

  return (
    <TablesClient
      tables={tables ?? []}
      restaurantSlug={slug}
    />
  );
}

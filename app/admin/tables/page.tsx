import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TablesClient from "./TablesClient";

export default async function TablesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("restaurant_id, restaurants(slug)")
    .eq("id", user.id)
    .single();

  if (!adminUser) redirect("/admin/login");

  const slug =
    (adminUser.restaurants as unknown as { slug: string } | null)?.slug ?? "";

  const { data: tables } = await supabase
    .from("tables")
    .select("id, table_number, qr_token, created_at")
    .eq("restaurant_id", adminUser.restaurant_id)
    .order("created_at");

  return (
    <TablesClient
      tables={tables ?? []}
      restaurantSlug={slug}
    />
  );
}

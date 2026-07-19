import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MenuClient from "./MenuClient";

export default async function MenuPage() {
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

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, display_order")
      .eq("restaurant_id", adminUser.restaurant_id)
      .order("display_order"),
    supabase
      .from("menu_items")
      .select("id, name, description, price, image_url, is_available, display_order, category_id")
      .eq("restaurant_id", adminUser.restaurant_id)
      .order("display_order"),
  ]);

  return (
    <MenuClient
      categories={categories ?? []}
      items={items ?? []}
    />
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerMenuClient from "./CustomerMenuClient";

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!restaurant) notFound();

  const { data: table } = await supabase
    .from("tables")
    .select("id, table_number, restaurant_id")
    .eq("qr_token", token)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!table) notFound();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, display_order")
      .eq("restaurant_id", restaurant.id)
      .order("display_order"),
    supabase
      .from("menu_items")
      .select("id, name, description, price, image_url, is_available, display_order, category_id")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .order("display_order"),
  ]);

  return (
    <CustomerMenuClient
      restaurantName={restaurant.name}
      tableNumber={table.table_number}
      slug={slug}
      token={token}
      categories={categories ?? []}
      items={items ?? []}
    />
  );
}

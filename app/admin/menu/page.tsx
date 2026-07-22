import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import MenuClient from "./MenuClient";

export default async function MenuPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const restaurantId = ctx.admin.restaurant_id;

  const [{ data: categories }, { data: items }, { data: optionGroups }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, display_order")
        .eq("restaurant_id", restaurantId)
        .order("display_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name, description, price, image_url, is_available, display_order, category_id",
        )
        .eq("restaurant_id", restaurantId)
        .order("display_order"),
      supabase
        .from("menu_item_option_groups")
        .select(
          "id, menu_item_id, title, selection_type, is_required, display_order, menu_item_options(id, name, price_adjustment, display_order)",
        )
        .eq("restaurant_id", restaurantId)
        .order("display_order"),
    ]);

  const customizationsByItemId: Record<
    string,
    {
      title: string;
      selectionType: "single" | "multi";
      isRequired: boolean;
      options: { name: string; priceAdjustment: number }[];
    }[]
  > = {};

  for (const group of optionGroups ?? []) {
    const options = (
      (group.menu_item_options ?? []) as {
        id: string;
        name: string;
        price_adjustment: number;
        display_order: number;
      }[]
    )
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((o) => ({
        name: o.name,
        priceAdjustment: Number(o.price_adjustment),
      }));

    const list = customizationsByItemId[group.menu_item_id] ?? [];
    list.push({
      title: group.title,
      selectionType: group.selection_type as "single" | "multi",
      isRequired: group.is_required,
      options,
    });
    customizationsByItemId[group.menu_item_id] = list;
  }

  return (
    <MenuClient
      categories={categories ?? []}
      items={items ?? []}
      customizationsByItemId={customizationsByItemId}
    />
  );
}

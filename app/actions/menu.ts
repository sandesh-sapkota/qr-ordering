"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MenuActionState = { error: string | null } | undefined;

async function getRestaurantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("admin_users")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!data) throw new Error("Admin user not found");
  return data.restaurant_id;
}

// ─── Category Actions ─────────────────────────────────────────────────────────

export async function createCategory(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "Category name is required." };

    const supabase = await createClient();
    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: restaurantId,
      name,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateCategory(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    if (!id) return { error: "Category ID is missing." };
    if (!name) return { error: "Category name is required." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_categories")
      .update({
        name,
        display_order: parseInt(formData.get("display_order") as string) || 0,
      })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteCategory(id: string): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

// ─── Menu Item Actions ────────────────────────────────────────────────────────

export async function createMenuItem(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const name = (formData.get("name") as string)?.trim();
    const price = parseFloat(formData.get("price") as string);
    const categoryId = formData.get("category_id") as string;

    if (!name) return { error: "Item name is required." };
    if (isNaN(price) || price < 0) return { error: "A valid price is required." };
    if (!categoryId) return { error: "A category is required." };

    const supabase = await createClient();
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name,
      description: (formData.get("description") as string)?.trim() || null,
      price,
      image_url: (formData.get("image_url") as string)?.trim() || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
      is_available: true,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateMenuItem(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const price = parseFloat(formData.get("price") as string);
    const categoryId = formData.get("category_id") as string;

    if (!id) return { error: "Item ID is missing." };
    if (!name) return { error: "Item name is required." };
    if (isNaN(price) || price < 0) return { error: "A valid price is required." };
    if (!categoryId) return { error: "A category is required." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_items")
      .update({
        category_id: categoryId,
        name,
        description: (formData.get("description") as string)?.trim() || null,
        price,
        image_url: (formData.get("image_url") as string)?.trim() || null,
        display_order: parseInt(formData.get("display_order") as string) || 0,
      })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteMenuItem(id: string): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function toggleItemAvailability(
  id: string,
  isAvailable: boolean,
): Promise<MenuActionState> {
  try {
    const restaurantId = await getRestaurantId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/menu");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

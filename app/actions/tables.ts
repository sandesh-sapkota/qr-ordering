"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TableActionState = { error: string | null } | undefined;

async function getAdminContext(): Promise<{ restaurantId: string; slug: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("admin_users")
    .select("restaurant_id, restaurants(slug)")
    .eq("id", user.id)
    .single();

  if (!data) throw new Error("Admin user not found");

  const slug =
    (data.restaurants as unknown as { slug: string } | null)?.slug ?? "";
  return { restaurantId: data.restaurant_id, slug };
}

export async function createTable(
  _prev: TableActionState,
  formData: FormData,
): Promise<TableActionState> {
  try {
    const { restaurantId } = await getAdminContext();
    const tableNumber = (formData.get("table_number") as string)?.trim();
    if (!tableNumber) return { error: "Table number/name is required." };

    const supabase = await createClient();
    const { error } = await supabase.from("tables").insert({
      restaurant_id: restaurantId,
      table_number: tableNumber,
      // qr_token defaults to gen_random_uuid() in the DB
    });
    if (error) return { error: error.message };

    revalidatePath("/admin/tables");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteTable(
  _prev: TableActionState,
  formData: FormData,
): Promise<TableActionState> {
  try {
    const { restaurantId } = await getAdminContext();
    const id = formData.get("id") as string;
    if (!id) return { error: "Table ID is missing." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("tables")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/tables");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function regenerateToken(
  _prev: TableActionState,
  formData: FormData,
): Promise<TableActionState> {
  try {
    const { restaurantId } = await getAdminContext();
    const id = formData.get("id") as string;
    if (!id) return { error: "Table ID is missing." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("tables")
      .update({ qr_token: crypto.randomUUID() })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    revalidatePath("/admin/tables");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

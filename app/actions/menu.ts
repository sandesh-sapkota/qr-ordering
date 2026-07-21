"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MenuActionState = { error: string | null } | undefined;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Uploads a menu item image to the public menu-item-images bucket via the
// service-role client (bypasses storage RLS — safe here since the caller has
// already been verified as this restaurant's admin) and returns its public URL.
async function uploadMenuItemImage(
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Image must be a PNG, JPEG, WebP, or GIF file." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be smaller than 2MB." };
  }

  const admin = createAdminClient();
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage
    .from("menu-item-images")
    .upload(path, file, { contentType: file.type });

  if (error) return { error: `Failed to upload image: ${error.message}` };

  const { data } = admin.storage.from("menu-item-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

// Resolves the image URL for a menu item create/update. Priority: an uploaded
// file wins if present; otherwise an explicit "remove" flag clears the image;
// otherwise fall back to the pasted URL field.
async function resolveImageUrl(
  formData: FormData,
): Promise<{ url: string | null } | { error: string }> {
  const imageFile = formData.get("image_file") as File | null;
  if (imageFile && imageFile.size > 0) {
    const result = await uploadMenuItemImage(imageFile);
    if ("error" in result) return { error: result.error };
    return { url: result.url };
  }
  if (formData.get("remove_image") === "true") {
    return { url: null };
  }
  return { url: (formData.get("image_url") as string)?.trim() || null };
}

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

// ─── Customizations ───────────────────────────────────────────────────────────

export type CustomizationOptionInput = {
  name: string;
  priceAdjustment: number;
};

export type CustomizationGroupInput = {
  title: string;
  selectionType: "single" | "multi";
  isRequired: boolean;
  options: CustomizationOptionInput[];
};

function parseCustomizations(
  formData: FormData,
): { groups: CustomizationGroupInput[] } | { error: string } {
  const raw = formData.get("customizations");
  if (raw == null || raw === "") return { groups: [] };
  if (typeof raw !== "string") return { error: "Invalid customizations payload." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid customizations payload." };
  }

  if (!Array.isArray(parsed)) return { error: "Invalid customizations payload." };

  // Letters/numbers plus common menu punctuation — rejects junk like "l;11".
  const CLEAN_LABEL = /^[\p{L}\p{N}][\p{L}\p{N}\s\-'/&.()]*$/u;

  function cleanLabel(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim();
  }

  const groups: CustomizationGroupInput[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      return { error: "Invalid customizations payload." };
    }
    const g = entry as Record<string, unknown>;
    const title = cleanLabel(g.title);
    const selectionType = g.selectionType;
    const isRequired = Boolean(g.isRequired);
    const optionsRaw = g.options;

    if (!title) continue; // skip empty drafts
    if (!CLEAN_LABEL.test(title)) {
      return {
        error: `Group title “${title}” has invalid characters. Use letters, numbers, and basic punctuation only.`,
      };
    }
    if (selectionType !== "single" && selectionType !== "multi") {
      return { error: "Each option group must be Single or Multiple choice." };
    }
    if (!Array.isArray(optionsRaw)) {
      return { error: "Each option group needs a list of choices." };
    }

    const options: CustomizationOptionInput[] = [];
    for (const opt of optionsRaw) {
      if (!opt || typeof opt !== "object") {
        return { error: "Invalid option in a customization group." };
      }
      const o = opt as Record<string, unknown>;
      const name = cleanLabel(o.name);
      if (!name) continue;

      if (!CLEAN_LABEL.test(name)) {
        return {
          error: `Choice “${name}” has invalid characters. Use letters, numbers, and basic punctuation only.`,
        };
      }

      const priceRaw =
        typeof o.priceAdjustment === "string"
          ? o.priceAdjustment.trim()
          : o.priceAdjustment;
      const priceParsed =
        priceRaw === "" || priceRaw == null
          ? 0
          : Number(
              typeof priceRaw === "string"
                ? priceRaw.replace(/,/g, "")
                : priceRaw,
            );
      if (!Number.isFinite(priceParsed)) {
        return { error: `Invalid price adjustment for “${name}”.` };
      }
      options.push({
        name,
        priceAdjustment: Math.round(priceParsed * 100) / 100,
      });
    }

    if (options.length === 0) {
      return {
        error: `Option group “${title}” needs at least one choice.`,
      };
    }

    groups.push({ title, selectionType, isRequired, options });
  }

  return { groups };
}

async function replaceItemCustomizations(
  restaurantId: string,
  menuItemId: string,
  groups: CustomizationGroupInput[],
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("menu_item_option_groups")
    .delete()
    .eq("menu_item_id", menuItemId)
    .eq("restaurant_id", restaurantId);

  if (deleteError) return { error: deleteError.message };

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const { data: insertedGroup, error: groupError } = await supabase
      .from("menu_item_option_groups")
      .insert({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        title: group.title,
        selection_type: group.selectionType,
        is_required: group.isRequired,
        display_order: gi,
      })
      .select("id")
      .single();

    if (groupError || !insertedGroup) {
      return { error: groupError?.message ?? "Failed to save option group." };
    }

    const { error: optionsError } = await supabase
      .from("menu_item_options")
      .insert(
        group.options.map((opt, oi) => ({
          restaurant_id: restaurantId,
          group_id: insertedGroup.id,
          name: opt.name,
          price_adjustment: opt.priceAdjustment,
          display_order: oi,
        })),
      );

    if (optionsError) return { error: optionsError.message };
  }

  return null;
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

    const imageResult = await resolveImageUrl(formData);
    if ("error" in imageResult) return { error: imageResult.error };

    const customizations = parseCustomizations(formData);
    if ("error" in customizations) return { error: customizations.error };

    const supabase = await createClient();
    const { data: inserted, error } = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description: (formData.get("description") as string)?.trim() || null,
        price,
        image_url: imageResult.url,
        display_order: parseInt(formData.get("display_order") as string) || 0,
        is_available: true,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return { error: error?.message ?? "Failed to create menu item." };
    }

    const customError = await replaceItemCustomizations(
      restaurantId,
      inserted.id,
      customizations.groups,
    );
    if (customError) return customError;

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

    const imageResult = await resolveImageUrl(formData);
    if ("error" in imageResult) return { error: imageResult.error };

    const customizations = parseCustomizations(formData);
    if ("error" in customizations) return { error: customizations.error };

    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_items")
      .update({
        category_id: categoryId,
        name,
        description: (formData.get("description") as string)?.trim() || null,
        price,
        image_url: imageResult.url,
        display_order: parseInt(formData.get("display_order") as string) || 0,
      })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) return { error: error.message };

    const customError = await replaceItemCustomizations(
      restaurantId,
      id,
      customizations.groups,
    );
    if (customError) return customError;

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

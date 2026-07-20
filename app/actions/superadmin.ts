"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SuperadminActionState = { error: string | null } | undefined;

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// Uploads a logo file to the public restaurant-logos bucket via the
// service-role client (bypasses storage RLS — safe here because the caller
// has already been verified as a platform admin) and returns its public URL.
async function uploadLogo(file: File): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { error: "Logo must be a PNG, JPEG, WebP, or GIF image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Logo must be smaller than 2MB." };
  }

  const admin = createAdminClient();
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage
    .from("restaurant-logos")
    .upload(path, file, { contentType: file.type });

  if (error) return { error: `Failed to upload logo: ${error.message}` };

  const { data } = admin.storage.from("restaurant-logos").getPublicUrl(path);
  return { url: data.publicUrl };
}

export type InviteAdminState =
  | { error: string | null; success?: string }
  | undefined;

// Gate every superadmin action on platform_admins membership. This is defense
// in depth: RLS already restricts writes to platform admins, but checking here
// gives a clean error instead of a confusing RLS failure, and keeps a
// compromised restaurant-admin session from ever reaching these mutations.
async function requirePlatformAdmin(): Promise<SupabaseClient> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!data) throw new Error("Forbidden");
  return supabase;
}

export async function createRestaurant(
  _prev: SuperadminActionState,
  formData: FormData,
): Promise<SuperadminActionState> {
  try {
    const supabase = await requirePlatformAdmin();

    const name = (formData.get("name") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const address = (formData.get("address") as string)?.trim();
    const logoUrlInput = (formData.get("logo_url") as string)?.trim();
    // Re-slugify server-side rather than trusting the submitted slug: the
    // client field is editable, so a user could type spaces or symbols.
    const slug = slugify((formData.get("slug") as string) || name || "");

    if (!name) return { error: "Restaurant name is required." };
    if (!slug) {
      return { error: "Could not derive a URL-safe slug — edit the slug field." };
    }

    // An uploaded file takes priority over a pasted URL if both are somehow
    // present — the file input is the primary path in the UI.
    let logoUrl: string | null = logoUrlInput || null;
    const logoFile = formData.get("logo_file") as File | null;
    if (logoFile && logoFile.size > 0) {
      const uploadResult = await uploadLogo(logoFile);
      if ("error" in uploadResult) return { error: uploadResult.error };
      logoUrl = uploadResult.url;
    }

    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        phone: phone || null,
        address: address || null,
        logo_url: logoUrl,
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation on restaurants.slug
      if (error.code === "23505") {
        return {
          error: `The slug "${slug}" is already taken. Choose a different one.`,
        };
      }
      return { error: error.message };
    }

    // Seed one default table so the restaurant isn't a completely empty state.
    const { error: tableError } = await supabase.from("tables").insert({
      restaurant_id: restaurant.id,
      table_number: "Table 1",
      qr_token: crypto.randomUUID(),
    });

    if (tableError) {
      // The restaurant was created successfully — don't fail the whole action
      // because of the seed table. Log it and move on.
      console.error("Failed to seed default table for restaurant", restaurant.id, tableError.message);
    }

    revalidatePath("/superadmin/restaurants");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return {
      error:
        message === "Forbidden" || message === "Unauthorized"
          ? "You do not have permission to perform this action."
          : message,
    };
  }
}

async function getOrigin(): Promise<string> {
  // Prefer an explicit site URL in production; fall back to the request host so
  // local dev works without extra config.
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// Invite a restaurant owner. Creates their Supabase Auth account and emails a
// link to set a password. The name + restaurant_id + role are stashed in the
// user's metadata so that, once they accept, we can link them into admin_users
// with values chosen here (not by the invitee). Uses the service role key via
// the admin client — that key is server-only and never reaches the browser.
export async function inviteAdmin(
  _prev: InviteAdminState,
  formData: FormData,
): Promise<InviteAdminState> {
  try {
    const supabase = await requirePlatformAdmin();

    const restaurantId = (formData.get("restaurantId") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();

    if (!restaurantId) return { error: "Missing restaurant." };
    if (!name) return { error: "Owner name is required." };
    if (!email) return { error: "Email is required." };
    // Cheap sanity check; Supabase will do the authoritative validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Enter a valid email address." };
    }

    // Confirm the restaurant exists before creating an auth account we'd have
    // to clean up. The platform-admin RLS policy allows this read.
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return { error: "That restaurant no longer exists." };
    }

    const admin = createAdminClient();
    const origin = await getOrigin();

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        restaurant_id: restaurantId,
        role: "owner",
      },
      // Works with the default invite template (Supabase verifies the token
      // then redirects here with the session in the URL fragment, which the
      // accept page picks up). If you customize the template to the token-hash
      // form, point it at /auth/confirm?...&next=/auth/accept-invite instead.
      redirectTo: `${origin}/auth/accept-invite`,
    });

    if (error) {
      // 422 email_exists — the address already has an auth account.
      if (
        error.status === 422 ||
        /already been registered|already registered|exists/i.test(error.message)
      ) {
        return {
          error: `${email} already has an account. Invite a different email, or link the existing user manually.`,
        };
      }
      return { error: error.message };
    }

    revalidatePath(`/superadmin/restaurants/${restaurantId}`);
    return {
      error: null,
      success: `Invitation sent to ${email}. They'll get an email to set a password.`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return {
      error:
        message === "Forbidden" || message === "Unauthorized"
          ? "You do not have permission to perform this action."
          : message,
    };
  }
}

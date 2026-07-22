import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminRestaurant = {
  name: string;
  logo_url: string | null;
  slug: string;
};

export type AdminUserRow = {
  id: string;
  restaurant_id: string;
  role: string;
  name: string | null;
  restaurants: AdminRestaurant | null;
};

export type AdminContext = {
  user: User;
  admin: AdminUserRow;
};

/**
 * Resolves the signed-in user + their admin_users row once per RSC request.
 * Layout and pages share this via React cache() so soft/hard navigations that
 * render both in the same request only hit Supabase Auth + admin_users once.
 */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, restaurant_id, role, name, restaurants(name, logo_url, slug)")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin) return null;

  return {
    user,
    admin: {
      id: admin.id,
      restaurant_id: admin.restaurant_id,
      role: admin.role,
      name: admin.name,
      restaurants: admin.restaurants as unknown as AdminRestaurant | null,
    },
  };
});

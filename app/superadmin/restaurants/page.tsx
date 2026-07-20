import { createClient } from "@/lib/supabase/server";
import RestaurantsClient, { type RestaurantRow } from "./RestaurantsClient";

// The layout already enforces platform-admin access, so this page can query
// freely: RLS grants platform admins read access to restaurants, tables, and
// (via the platform-admin SELECT policy) admin_users across all tenants.
export default async function RestaurantsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, created_at, tables(count), admin_users(count)")
    .order("created_at", { ascending: false });

  const restaurants: RestaurantRow[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    created_at: r.created_at,
    tableCount: r.tables?.[0]?.count ?? 0,
    adminCount: r.admin_users?.[0]?.count ?? 0,
  }));

  return (
    <RestaurantsClient
      restaurants={restaurants}
      loadError={error?.message ?? null}
    />
  );
}

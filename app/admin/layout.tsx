import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import AdminShell from "./AdminShell";

// Shared shell for every /admin page. This layout also wraps /admin/login,
// which must render without the nav — and layouts can't read the pathname —
// so the nav is gated on auth instead: no authenticated admin_users row means
// no nav (the middleware already bounces unauthenticated visits to login, and
// the pages themselves redirect users without an admin_users row).
//
// Kitchen Display (/admin/kitchen) also hides the nav via AdminShell so tickets
// can use the full tablet viewport.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  if (!ctx) {
    return <>{children}</>;
  }

  // Platform-admin check stays here — not part of the restaurant admin context,
  // and only needed for the nav chrome (which is preserved across soft navs).
  const supabase = await createClient();
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("id", ctx.user.id)
    .maybeSingle();

  const restaurant = ctx.admin.restaurants;

  return (
    <AdminShell
      adminName={ctx.admin.name ?? ctx.user.email ?? "Admin"}
      restaurantName={restaurant?.name ?? "Restaurant"}
      restaurantLogoUrl={restaurant?.logo_url ?? null}
      isPlatformAdmin={Boolean(platformAdmin)}
    >
      {children}
    </AdminShell>
  );
}

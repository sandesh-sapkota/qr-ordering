import { createClient } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

// Shared shell for every /admin page. This layout also wraps /admin/login,
// which must render without the nav — and layouts can't read the pathname —
// so the nav is gated on auth instead: no authenticated admin_users row means
// no nav (the middleware already bounces unauthenticated visits to login, and
// the pages themselves redirect users without an admin_users row).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const [{ data: adminUser }, { data: platformAdmin }] = await Promise.all([
    supabase
      .from("admin_users")
      .select("name, restaurants(name)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("platform_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!adminUser) {
    return <>{children}</>;
  }

  const restaurantName =
    (adminUser.restaurants as unknown as { name: string } | null)?.name ??
    "Restaurant";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 md:flex-row">
      <AdminNav
        adminName={adminUser.name ?? user.email ?? "Admin"}
        restaurantName={restaurantName}
        isPlatformAdmin={Boolean(platformAdmin)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

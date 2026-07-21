import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

// Guards the entire /superadmin route group: only Supabase-authenticated users
// who also have a row in platform_admins may pass. Everyone else — logged out
// or a plain restaurant admin — is bounced to the admin login.
export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id, name")
    .eq("id", user.id)
    .single();

  if (!platformAdmin) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/restaurants" className="flex items-center gap-2">
            <span className="rounded-md bg-brand-accent px-2 py-0.5 text-xs font-semibold text-zinc-950">
              Platform
            </span>
            <h1 className="text-lg font-semibold text-zinc-900">Superadmin</h1>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:inline">
            {platformAdmin.name ?? user.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

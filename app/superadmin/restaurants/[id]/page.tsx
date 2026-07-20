import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteAdminClient from "./InviteAdminClient";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// The layout already enforces platform-admin access. RLS grants platform admins
// read access to restaurants and admin_users across all tenants.
export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, phone, address, logo_url, created_at")
    .eq("id", id)
    .single();

  if (!restaurant) notFound();

  const { data: admins } = await supabase
    .from("admin_users")
    .select("id, name, role, created_at")
    .eq("restaurant_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Link
        href="/superadmin/restaurants"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800"
      >
        ← All restaurants
      </Link>

      <div className="mb-6 flex items-start gap-4">
        {restaurant.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.logo_url}
            alt={`${restaurant.name} logo`}
            className="h-14 w-14 shrink-0 rounded-lg border border-zinc-200 object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {restaurant.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
              /r/{restaurant.slug}
            </code>
            {restaurant.phone ? (
              <span className="ml-2">· {restaurant.phone}</span>
            ) : null}
            <span className="ml-2">
              · Added {formatDate(restaurant.created_at)}
            </span>
          </p>
          {restaurant.address ? (
            <p className="mt-1 text-sm text-zinc-500">{restaurant.address}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ─── Admins list ─────────────────────────────────────────────── */}
        <section className="order-2 lg:order-1">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            Admins{" "}
            <span className="font-normal text-zinc-400">
              ({admins?.length ?? 0})
            </span>
          </h2>

          {!admins || admins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-400">
              No admins yet. Invite the owner to get started.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 font-medium text-zinc-900">
                        {a.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                          {a.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {formatDate(a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── Invite admin form ───────────────────────────────────────── */}
        <section className="order-1 lg:order-2">
          <InviteAdminClient restaurantId={restaurant.id} />
        </section>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import DailyAnalytics from "./DailyAnalytics";
import DailyAnalyticsSkeleton from "./DailyAnalyticsSkeleton";
import DashboardClient, { type DashboardOrder } from "./DashboardClient";

function DashboardHeader() {
  const todayLabel = new Date().toLocaleDateString("en-NP", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kathmandu",
  });

  return (
    <header className="border-b border-[#E8E0D4]/60 bg-[#F7F3EC]/80 px-4 py-6 backdrop-blur-sm sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{todayLabel}</p>
    </header>
  );
}

async function DashboardOrders({ restaurantId }: { restaurantId: string }) {
  const supabase = await createClient();

  // Fetch the last 48h so the client can derive both the local calendar day
  // and the prior local day for vs-yesterday comparisons on the charts.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, created_at, updated_at, tables(table_number), order_items(id, quantity, menu_items(name))",
    )
    .eq("restaurant_id", restaurantId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      initialOrders={(orders ?? []) as unknown as DashboardOrder[]}
    />
  );
}

function DashboardOrdersSkeleton() {
  return (
    <div className="space-y-10" aria-busy aria-label="Loading dashboard charts">
      <div className="rounded-2xl border border-[#E8E0D4] bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)] sm:p-8">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-zinc-100" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-[#F7F3EC]" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)]">
        <div className="border-b border-[#EDE7DC] px-6 py-5">
          <div className="h-4 w-52 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="space-y-0 px-6 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-slate-100/80 py-4 last:border-b-0"
            >
              <div className="h-3.5 w-14 animate-pulse rounded bg-zinc-100" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-zinc-100" />
              <div className="h-3.5 flex-1 animate-pulse rounded bg-zinc-100" />
              <div className="h-3.5 w-16 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");

  const restaurantId = ctx.admin.restaurant_id;

  return (
    <div className="min-h-screen bg-[#F7F3EC]">
      <DashboardHeader />

      <main className="mx-auto max-w-5xl space-y-10 p-4 sm:p-8 lg:p-10">
        <Suspense fallback={<DailyAnalyticsSkeleton />}>
          <DailyAnalytics restaurantId={restaurantId} />
        </Suspense>

        <Suspense fallback={<DashboardOrdersSkeleton />}>
          <DashboardOrders restaurantId={restaurantId} />
        </Suspense>
      </main>
    </div>
  );
}

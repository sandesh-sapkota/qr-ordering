import type { ReactNode } from "react";
import {
  getDailyAnalytics,
  type DailyAnalytics as DailyAnalyticsData,
  type TopSoldItem,
} from "@/lib/admin/analytics";

function formatNpr(amount: number) {
  const formatted = amount.toLocaleString("en-NP", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

function averageOrderValue(data: DailyAnalyticsData) {
  if (data.totalCompletedOrdersToday === 0) return 0;
  return data.totalRevenueToday / data.totalCompletedOrdersToday;
}

export default async function DailyAnalytics({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const data = await getDailyAnalytics(restaurantId);
  const aov = averageOrderValue(data);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <KpiCard
          label="Today's Revenue"
          value={formatNpr(data.totalRevenueToday)}
          icon={<RevenueIcon />}
          tone="amber"
        />
        <KpiCard
          label="Orders Completed Today"
          value={String(data.totalCompletedOrdersToday)}
          icon={<OrdersIcon />}
          tone="orange"
        />
        <KpiCard
          label="Average Order Value"
          value={formatNpr(aov)}
          icon={<AovIcon />}
          tone="stone"
          hint={
            data.totalCompletedOrdersToday === 0
              ? "No completed orders yet"
              : undefined
          }
        />
      </section>

      <TopSellingItems items={data.topSoldItems} nepalDate={data.nepalDate} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "amber" | "orange" | "stone";
  hint?: string;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : "bg-[#F7F3EC] text-zinc-600";

  return (
    <div className="rounded-2xl border border-[#E8E0D4] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)] sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-zinc-400">{hint}</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-400">Nepal time · Asia/Kathmandu</p>
      )}
    </div>
  );
}

function TopSellingItems({
  items,
  nepalDate,
}: {
  items: TopSoldItem[];
  nepalDate: string;
}) {
  const dateLabel = formatNepalDateLabel(nepalDate);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)]">
      <div className="flex flex-col gap-1 border-b border-[#EDE7DC] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            Top Selling Items Today
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Top 5 by quantity · {dateLabel}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-600">
            No completed sales yet today
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Top sellers will appear here as orders are completed
          </p>
        </div>
      ) : (
        <>
          {/* Mobile list */}
          <ul className="divide-y divide-[#EDE7DC] sm:hidden">
            {items.map((item, index) => (
              <li
                key={item.menuItemId}
                className="flex items-start gap-3 px-5 py-4"
              >
                <RankBadge rank={index + 1} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {item.itemName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.totalQuantitySold} sold
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {formatNpr(item.totalRevenue)}
                </p>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100/80 bg-[#FBF8F3] text-xs font-semibold uppercase tracking-[0.07em] text-slate-400">
                  <th className="px-6 py-3.5 text-left">Rank</th>
                  <th className="px-6 py-3.5 text-left">Item Name</th>
                  <th className="px-6 py-3.5 text-right">Quantity Sold</th>
                  <th className="px-6 py-3.5 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.menuItemId}
                    className="border-b border-slate-100/80 last:border-b-0 transition-colors hover:bg-[#FBF8F3]"
                  >
                    <td className="px-6 py-4">
                      <RankBadge rank={index + 1} />
                    </td>
                    <td className="px-6 py-4 text-[15px] font-semibold tracking-tight text-zinc-900">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-zinc-600">
                      {item.totalQuantitySold}
                    </td>
                    <td className="px-6 py-4 text-right text-[15px] font-semibold tabular-nums tracking-tight text-zinc-900 whitespace-nowrap">
                      {formatNpr(item.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank === 1;
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
        isTop
          ? "bg-brand-accent text-zinc-950"
          : "bg-[#F7F3EC] text-zinc-600"
      }`}
    >
      {rank}
    </span>
  );
}

function formatNepalDateLabel(nepalDate: string) {
  const [y, m, d] = nepalDate.split("-").map(Number);
  if (!y || !m || !d) return nepalDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-NP", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function RevenueIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function AovIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}

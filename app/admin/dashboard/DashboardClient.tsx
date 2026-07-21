"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "preparing"
  | "served"
  | "completed"
  | "cancelled";

export type DashboardOrder = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  tables: { table_number: string } | null;
  order_items: {
    id: string;
    quantity: number;
    menu_items: { name: string } | null;
  }[];
};

// Same definition as the live orders board: orders still needing staff
// attention (New / Preparing / Served).
const ACTIVE_STATUSES = new Set<OrderStatus>([
  "pending",
  "preparing",
  "served",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return `Rs. ${Number(price).toFixed(2).replace(/\.00$/, "")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHour(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

function formatDelta(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) {
    return { label: "Same as yesterday", direction: "flat" as const };
  }
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  return {
    label: `${sign}${abs} vs yesterday`,
    direction: (delta > 0 ? "up" : "down") as "up" | "down",
  };
}

function formatRevenueDelta(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) {
    return { label: "Same as yesterday", direction: "flat" as const };
  }
  const sign = delta > 0 ? "+" : "−";
  return {
    label: `${sign}${formatPrice(Math.abs(delta))} vs yesterday`,
    direction: (delta > 0 ? "up" : "down") as "up" | "down",
  };
}

// Ticks every minute so the "today" boundary rolls over at local midnight
// without a refresh.
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── Completed table sorting ──────────────────────────────────────────────────

type SortKey = "time" | "table" | "items" | "total";
type SortDir = "asc" | "desc";

function itemCount(order: DashboardOrder) {
  return order.order_items.reduce((sum, line) => sum + line.quantity, 0);
}

function compareOrders(a: DashboardOrder, b: DashboardOrder, key: SortKey) {
  switch (key) {
    case "time":
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "table":
      return (a.tables?.table_number ?? "").localeCompare(
        b.tables?.table_number ?? "",
        undefined,
        { numeric: true },
      );
    case "items":
      return itemCount(a) - itemCount(b);
    case "total":
      return Number(a.total_amount) - Number(b.total_amount);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient({
  initialOrders,
}: {
  initialOrders: DashboardOrder[];
}) {
  const now = useNow(60000);

  // Start of the current calendar day in the viewer's local timezone (the
  // restaurant's), so every "today" number rolls over at local midnight.
  const startOfDay = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);

  const startOfYesterday = useMemo(
    () => startOfDay - 24 * 60 * 60 * 1000,
    [startOfDay],
  );

  // Every "today" figure on this page — stat cards, chart, completed list —
  // derives from this one created_at filter, so the numbers always agree.
  const todayOrders = useMemo(
    () =>
      initialOrders.filter(
        (o) => new Date(o.created_at).getTime() >= startOfDay,
      ),
    [initialOrders, startOfDay],
  );

  // Prior local calendar day — used only for honest vs-yesterday deltas.
  const yesterdayOrders = useMemo(
    () =>
      initialOrders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfYesterday && t < startOfDay;
      }),
    [initialOrders, startOfYesterday, startOfDay],
  );

  const stats = useMemo(() => {
    let revenue = 0;
    let active = 0;
    for (const o of todayOrders) {
      revenue += Number(o.total_amount) || 0;
      if (ACTIVE_STATUSES.has(o.status)) active += 1;
    }
    return { count: todayOrders.length, revenue, active };
  }, [todayOrders]);

  const yesterdayStats = useMemo(() => {
    let revenue = 0;
    for (const o of yesterdayOrders) {
      revenue += Number(o.total_amount) || 0;
    }
    return { count: yesterdayOrders.length, revenue };
  }, [yesterdayOrders]);

  const revenueByHour = useMemo(() => {
    const currentHour = new Date(now).getHours();
    const buckets = Array.from({ length: currentHour + 1 }, (_, hour) => ({
      hour,
      label: formatHour(hour),
      revenue: 0,
    }));
    for (const o of todayOrders) {
      const hour = new Date(o.created_at).getHours();
      if (buckets[hour]) buckets[hour].revenue += Number(o.total_amount) || 0;
    }
    return buckets;
  }, [todayOrders, now]);

  const completedToday = useMemo(
    () => todayOrders.filter((o) => o.status === "completed"),
    [todayOrders],
  );

  // Active Now as a share of today's orders — same numbers as the stat cards,
  // just a different visual. Remainder = settled / cancelled / other today.
  const activeShare = useMemo(() => {
    const active = stats.active;
    const rest = Math.max(stats.count - active, 0);
    return [
      { name: "Active", value: active, color: "var(--brand-accent)" },
      {
        name: "Settled",
        value: rest,
        color: "color-mix(in srgb, var(--brand-accent) 14%, #f3efe8)",
      },
    ];
  }, [stats.active, stats.count]);

  const ordersTrend = formatDelta(stats.count, yesterdayStats.count);
  const revenueTrend = formatRevenueDelta(
    stats.revenue,
    yesterdayStats.revenue,
  );

  return (
    <div className="min-h-screen bg-[#F7F3EC]">
      <header className="border-b border-[#E8E0D4]/60 bg-[#F7F3EC]/80 px-4 py-6 backdrop-blur-sm sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {new Date(now).toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 p-4 sm:p-8 lg:p-10">
        {/* Stat cards */}
        <section className="grid gap-5 sm:grid-cols-3">
          <StatCard
            label="Orders Today"
            value={String(stats.count)}
            icon={<OrdersIcon />}
            iconTone="amber"
            trend={ordersTrend}
          />
          <StatCard
            label="Revenue Today"
            amount={stats.revenue}
            icon={<RevenueIcon />}
            iconTone="emerald"
            trend={revenueTrend}
          />
          <StatCard
            label="Active Now"
            value={String(stats.active)}
            icon={<ActiveIcon />}
            iconTone="sky"
            hint={
              <span className="flex items-center gap-3">
                <Dot color="bg-amber-500" label="New" />
                <Dot color="bg-blue-500" label="Preparing" />
                <Dot color="bg-green-500" label="Served" />
              </span>
            }
          />
        </section>

        {/* Revenue by hour + active share of today */}
        <section className="rounded-2xl border border-[#E8E0D4] bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)] sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                Revenue by Hour
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Today only</p>
              <div className="mt-6 h-64">
                {stats.count === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                    No orders yet today
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueByHour}
                      margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="revenueBarGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--brand-accent)"
                            stopOpacity={0.95}
                          />
                          <stop
                            offset="55%"
                            stopColor="var(--brand-accent)"
                            stopOpacity={0.55}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--brand-accent)"
                            stopOpacity={0.18}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="#EDE7DC"
                        strokeDasharray="4 6"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#A8A29E" }}
                        tickLine={false}
                        axisLine={{ stroke: "#EDE7DC" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#A8A29E" }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(245, 158, 11, 0.12)" }}
                        content={<RevenueTooltip />}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="url(#revenueBarGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col justify-between border-t border-[#EDE7DC] pt-6 lg:w-52 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
                  Active share
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Active Now of today&apos;s orders
                </p>
              </div>
              <div className="relative mx-auto my-4 h-36 w-36">
                {stats.count === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    —
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeShare}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={62}
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                          paddingAngle={stats.active > 0 && stats.count > stats.active ? 2 : 0}
                        >
                          {activeShare.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold tracking-tight text-zinc-900">
                        {stats.count === 0
                          ? "0%"
                          : `${Math.round((stats.active / stats.count) * 100)}%`}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        active
                      </span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-center text-xs text-zinc-500">
                <span className="font-semibold text-zinc-800">
                  {stats.active}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-zinc-800">
                  {stats.count}
                </span>{" "}
                orders
              </p>
            </div>
          </div>
        </section>

        {/* Completed today */}
        <CompletedTable orders={completedToday} />
      </main>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type Trend = {
  label: string;
  direction: "up" | "down" | "flat";
};

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl border border-[#E8E0D4] bg-white px-3.5 py-2.5 shadow-[0_8px_24px_rgba(28,25,23,0.12)]">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">
        Revenue{" "}
        <span className="text-brand-accent">{formatPrice(value)}</span>
      </p>
    </div>
  );
}

function formatAmountDigits(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, "");
}

function StatCard({
  label,
  value,
  amount,
  hint,
  icon,
  iconTone,
  trend,
}: {
  label: string;
  value?: string;
  /** When set, renders "Rs." muted + amount as the display number. */
  amount?: number;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  iconTone: "amber" | "emerald" | "sky";
  trend?: Trend;
}) {
  const toneClass =
    iconTone === "amber"
      ? "bg-amber-50 text-amber-600"
      : iconTone === "emerald"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-sky-50 text-sky-600";

  const trendClass =
    trend?.direction === "up"
      ? "text-xs font-medium text-emerald-600"
      : trend?.direction === "down"
        ? "text-xs font-medium text-rose-500"
        : "text-xs font-medium text-slate-400";

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-6 shadow-sm sm:px-7 sm:py-7">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}
        >
          {icon}
        </span>
      </div>
      {amount !== undefined ? (
        <p className="mt-4 flex items-baseline tracking-tight">
          <span className="mr-1.5 text-lg font-normal text-slate-400">Rs.</span>
          <span className="text-3xl font-semibold tracking-tight text-slate-800">
            {formatAmountDigits(amount)}
          </span>
        </p>
      ) : (
        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-800">
          {value}
        </p>
      )}
      {trend && (
        <p className={`mt-3 ${trendClass}`}>
          {trend.direction === "up" && (
            <span className="mr-1 inline-block" aria-hidden>
              ↑
            </span>
          )}
          {trend.direction === "down" && (
            <span className="mr-1 inline-block" aria-hidden>
              ↓
            </span>
          )}
          {trend.label}
        </p>
      )}
      {hint && <div className="mt-3 text-[11px] text-zinc-400">{hint}</div>}
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
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

function ActiveIcon() {
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
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

// ─── Completed Today table ────────────────────────────────────────────────────

const COMPLETED_COLUMNS: { key: SortKey; label: string; align: string }[] = [
  { key: "time", label: "Time", align: "text-left" },
  { key: "table", label: "Table", align: "text-left" },
  { key: "items", label: "Items", align: "text-left" },
  { key: "total", label: "Total", align: "text-right" },
];

function CompletedTable({ orders }: { orders: DashboardOrder[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "time" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => {
      const cmp = compareOrders(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [orders, sortKey, sortDir]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)]">
      <div className="flex items-center gap-2.5 border-b border-[#EDE7DC] px-6 py-5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          Completed Today
        </h2>
        <span className="ml-auto rounded-full bg-[#F7F3EC] px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="py-14 text-center text-sm text-zinc-400">
          No completed orders yet today
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EDE7DC] bg-[#FBF8F3] text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                {COMPLETED_COLUMNS.map((col) => (
                  <th key={col.key} className={`px-6 py-3.5 ${col.align}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1.5 uppercase tracking-[0.07em] transition-colors hover:text-zinc-900"
                    >
                      {col.label}
                      <span
                        className={`text-[9px] ${
                          sortKey === col.key
                            ? "text-zinc-800"
                            : "text-zinc-300"
                        }`}
                      >
                        {sortKey === col.key && sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#F0EBE3] last:border-b-0 transition-colors hover:bg-[#FBF8F3]"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-[13px] tabular-nums text-zinc-400">
                    {formatTime(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-[15px] font-semibold tracking-tight text-zinc-900">
                    Table {order.tables?.table_number ?? "?"}
                  </td>
                  <td className="max-w-0 px-6 py-4 text-[13px] leading-snug text-zinc-500">
                    <span className="block truncate">
                      {order.order_items
                        .map(
                          (line) =>
                            `${line.quantity}× ${line.menu_items?.name ?? "Unknown item"}`,
                        )
                        .join(", ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-[15px] font-semibold tabular-nums tracking-tight text-zinc-900 whitespace-nowrap">
                    {formatPrice(order.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

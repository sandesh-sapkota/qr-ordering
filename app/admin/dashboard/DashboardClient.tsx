"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { fetchCompletedOrders } from "@/app/actions/dashboard";

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

  // Charts + completed list derive from this one created_at filter so they agree.
  const todayOrders = useMemo(
    () =>
      initialOrders.filter(
        (o) => new Date(o.created_at).getTime() >= startOfDay,
      ),
    [initialOrders, startOfDay],
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

  // Active Now as a share of today's orders. Remainder = settled / cancelled.
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

  return (
    <div className="space-y-10">
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
                        paddingAngle={
                          stats.active > 0 && stats.count > stats.active ? 2 : 0
                        }
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
              <span className="font-semibold text-zinc-800">{stats.active}</span>{" "}
              of{" "}
              <span className="font-semibold text-zinc-800">{stats.count}</span>{" "}
              orders
            </p>
          </div>
        </div>
      </section>

      {/* Completed orders — date-filterable */}
      <CompletedTable initialOrders={completedToday} />
    </div>
  );
}

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

// ─── Completed orders table (date-filtered) ───────────────────────────────────

const COMPLETED_COLUMNS: { key: SortKey; label: string; align: string }[] = [
  { key: "time", label: "Time", align: "text-left" },
  { key: "table", label: "Table", align: "text-left" },
  { key: "items", label: "Items", align: "text-left" },
  { key: "total", label: "Total", align: "text-right" },
];

type DateFilter = "today" | "yesterday" | "last7" | "custom";

const FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "custom", label: "Custom Date" },
];

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfLocalDay(d: Date) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function completedRange(
  filter: DateFilter,
  customDate: string,
): { start: Date; end: Date; titleSuffix: string; emptyFor: string } {
  const now = new Date();
  const todayStart = startOfLocalDay(now);

  if (filter === "yesterday") {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 1);
    return {
      start,
      end: endOfLocalDay(start),
      titleSuffix: "Yesterday",
      emptyFor: "yesterday",
    };
  }

  if (filter === "last7") {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 6);
    return {
      start,
      end: endOfLocalDay(now),
      titleSuffix: "Last 7 Days",
      emptyFor: "the last 7 days",
    };
  }

  if (filter === "custom") {
    const day = customDate ? parseYmd(customDate) : new Date();
    const safeDay = Number.isNaN(day.getTime()) ? new Date() : day;
    const label = safeDay.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return {
      start: startOfLocalDay(safeDay),
      end: endOfLocalDay(safeDay),
      titleSuffix: label,
      emptyFor: label,
    };
  }

  return {
    start: todayStart,
    end: endOfLocalDay(now),
    titleSuffix: "Today",
    emptyFor: "today",
  };
}

function CompletedTable({
  initialOrders,
}: {
  initialOrders: DashboardOrder[];
}) {
  const [filter, setFilter] = useState<DateFilter>("today");
  const [customDate, setCustomDate] = useState(() => toYmd(new Date()));
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Skip the first fetch when SSR already seeded today's completed rows.
  const skipNextFetch = useRef(true);
  const requestId = useRef(0);

  const range = useMemo(
    () => completedRange(filter, customDate),
    [filter, customDate],
  );

  const loadOrders = useEffectEvent(async (start: Date, end: Date) => {
    const id = ++requestId.current;
    setLoading(true);
    setFetchError(null);
    try {
      const { orders: next, error } = await fetchCompletedOrders(
        start.toISOString(),
        end.toISOString(),
      );
      if (id !== requestId.current) return;
      if (error) {
        setFetchError(error);
        setOrders([]);
        return;
      }
      setOrders(next as DashboardOrder[]);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  });

  useEffect(() => {
    if (skipNextFetch.current && filter === "today") {
      skipNextFetch.current = false;
      return;
    }
    skipNextFetch.current = false;
    void loadOrders(range.start, range.end);
  }, [filter, customDate, range.start, range.end]);

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
      <div className="flex flex-col gap-3 border-b border-[#EDE7DC] px-6 py-5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
          <h2 className="truncate text-base font-semibold tracking-tight text-zinc-900">
            Completed Orders
            <span className="font-normal text-zinc-400">
              {" "}
              • {range.titleSuffix}
            </span>
          </h2>
          <span className="shrink-0 rounded-full bg-[#F7F3EC] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
            {loading ? "…" : orders.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <label className="sr-only" htmlFor="completed-date-filter">
            Filter completed orders by date
          </label>
          <div className="relative">
            <select
              id="completed-date-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as DateFilter)}
              className="appearance-none rounded-xl border border-[#E8E0D4] bg-[#FBF8F3] py-2 pr-9 pl-3 text-sm font-medium text-zinc-800 outline-none transition-colors hover:border-[#D9CFC0] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-zinc-400"
              aria-hidden
            >
              ▼
            </span>
          </div>

          {filter === "custom" && (
            <input
              type="date"
              value={customDate}
              max={toYmd(new Date())}
              onChange={(e) => setCustomDate(e.target.value)}
              className="rounded-xl border border-[#E8E0D4] bg-[#FBF8F3] px-3 py-2 text-sm font-medium text-zinc-800 outline-none transition-colors hover:border-[#D9CFC0] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            />
          )}
        </div>
      </div>

      {fetchError ? (
        <p className="py-14 text-center text-sm text-rose-500">{fetchError}</p>
      ) : loading ? (
        <CompletedTableSkeleton />
      ) : orders.length === 0 ? (
        <CompletedEmptyState emptyFor={range.emptyFor} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100/80 bg-[#FBF8F3] text-xs font-semibold uppercase tracking-[0.07em] text-slate-400">
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
                  className="border-b border-slate-100/80 last:border-b-0 transition-colors hover:bg-[#FBF8F3]"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-[13px] tabular-nums text-zinc-400">
                    {filter === "last7"
                      ? new Date(order.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : formatTime(order.created_at)}
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

function CompletedTableSkeleton() {
  return (
    <div className="space-y-0 px-6 py-2" aria-busy aria-label="Loading orders">
      {Array.from({ length: 5 }).map((_, i) => (
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
  );
}

function CompletedEmptyState({ emptyFor }: { emptyFor: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F3EC] text-zinc-400">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-600">
        No completed orders found for {emptyFor}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        Try another date or check back later
      </p>
    </div>
  );
}

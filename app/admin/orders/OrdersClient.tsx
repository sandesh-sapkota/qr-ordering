"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "preparing"
  | "served"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  tables: { table_number: string } | null;
  order_items: {
    id: string;
    quantity: number;
    price_at_order_time: number;
    notes: string | null;
    menu_items: { name: string } | null;
  }[];
};

const ORDER_SELECT =
  "id, status, total_amount, created_at, updated_at, tables(table_number), order_items(id, quantity, price_at_order_time, notes, menu_items(name))";

const COLUMNS: { status: OrderStatus; label: string; accent: string }[] = [
  { status: "pending", label: "New", accent: "bg-amber-500" },
  { status: "preparing", label: "Preparing", accent: "bg-blue-500" },
  { status: "served", label: "Served", accent: "bg-green-500" },
  { status: "completed", label: "Completed", accent: "bg-zinc-400" },
];

const NEXT_ACTION: Partial<
  Record<OrderStatus, { nextStatus: OrderStatus; label: string }>
> = {
  pending: { nextStatus: "preparing", label: "Start Preparing" },
  preparing: { nextStatus: "served", label: "Mark Served" },
  served: { nextStatus: "completed", label: "Complete" },
};

// The Completed column shows only recently-finished orders so it stays a quick
// "did that just go out?" glance rather than an endless log. Older completed
// orders stay in the database (see /admin/dashboard) — they just leave the column.
const COMPLETED_VISIBLE_MS = 10 * 60 * 1000;

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

// ─── Status urgency ───────────────────────────────────────────────────────────
// New/Preparing orders sitting too long are the ones staff need to notice —
// Served/Completed are done, so they never get urgency treatment.

type Urgency = "green" | "yellow" | "red";

const URGENCY_STATUSES = new Set<OrderStatus>(["pending", "preparing"]);

const URGENCY_BORDER: Record<Urgency, string> = {
  green: "border-green-300",
  yellow: "border-yellow-400",
  red: "border-red-400",
};

const URGENCY_TEXT: Record<Urgency, string> = {
  green: "text-green-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
};

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function getUrgency(minutes: number): Urgency {
  if (minutes < 10) return "green";
  if (minutes < 20) return "yellow";
  return "red";
}

function formatElapsed(minutes: number) {
  return minutes < 1 ? "just now" : `${minutes} min ago`;
}

// Re-renders every `intervalMs` so elapsed-time labels stay current without
// a page refresh, without needing a fresh subscription or data fetch.
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── Audio ────────────────────────────────────────────────────────────────────
// Browsers block AudioContext until a user gesture. Creating it inside a
// Realtime callback leaves it suspended forever — unlock on click first.

async function ensureAudioContext(
  ctxRef: React.MutableRefObject<AudioContext | null>,
): Promise<AudioContext | null> {
  try {
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx.state === "running" ? ctx : null;
  } catch {
    return null;
  }
}

async function playChime(
  ctxRef: React.MutableRefObject<AudioContext | null>,
) {
  const ctx = await ensureAudioContext(ctxRef);
  if (!ctx) return;
  const audio = ctx;

  // Strike a single bell tone: instantaneous attack, long exponential decay.
  function strike(frequency: number, startTime: number, peakGain: number) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    // Hard attack, then slow bell-like decay over ~1.2 s.
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
    osc.start(startTime);
    osc.stop(startTime + 1.2);
  }

  // "Ding" — higher note (E5 ≈ 659 Hz), then "Dong" — lower note (B4 ≈ 494 Hz)
  // offset by 0.28 s so they overlap softly rather than clashing.
  strike(659, audio.currentTime, 0.28);
  strike(494, audio.currentTime + 0.28, 0.22);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrdersClient({
  restaurantId,
  initialOrders,
}: {
  restaurantId: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  // newOrderIds tracks which order IDs should show the arrival highlight.
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Keep a ref so the subscription closure can read the current muted value
  // without needing to be recreated on every toggle.
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Single AudioContext shared across all beeps (browsers allow only a few).
  const audioCtxRef = useRef<AudioContext | null>(null);
  // True once a user gesture has successfully resumed the AudioContext.
  const [audioReady, setAudioReady] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Unlock audio on the first click/tap anywhere on the page — required by
  // browser autoplay policy before playChime can make any sound.
  useEffect(() => {
    async function unlock() {
      const ctx = await ensureAudioContext(audioCtxRef);
      if (ctx) setAudioReady(true);
    }
    const opts = { capture: true, once: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock, opts);
      window.removeEventListener("keydown", unlock, opts);
    };
  }, []);

  useEffect(() => {
    async function fetchOrder(orderId: string): Promise<Order | null> {
      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", orderId)
        .single();
      return data as unknown as Order | null;
    }

    function upsertOrder(order: Order) {
      setOrders((prev) => {
        const rest = prev.filter((o) => o.id !== order.id);
        return [...rest, order].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      });
    }

    function markNew(orderId: string) {
      setNewOrderIds((prev) => new Set([...prev, orderId]));
      // Clear the highlight after the animation completes.
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 2500);
    }

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          // The payload lacks joined table/items — refetch the full order.
          const order = await fetchOrder(payload.new.id as string);
          if (order) {
            upsertOrder(order);
            // Alert only for genuine new-row events, not status updates.
            if (!mutedRef.current) playChime(audioCtxRef);
            markNew(order.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const updated = payload.new as {
            id: string;
            status: OrderStatus;
            total_amount: number;
            updated_at: string;
          };
          setOrders((prev) => {
            const existing = prev.find((o) => o.id === updated.id);
            if (!existing) return prev;
            return prev.map((o) =>
              o.id === updated.id
                ? {
                    ...o,
                    status: updated.status,
                    total_amount: updated.total_amount,
                    updated_at: updated.updated_at,
                  }
                : o,
            );
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId]);

  // No local state change here — the card moves when the Realtime
  // subscription receives the UPDATE from the database.
  async function advanceOrder(order: Order) {
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    await supabase
      .from("orders")
      .update({ status: action.nextStatus })
      .eq("id", order.id);
  }

  // Ticks periodically so the Completed column's 10-minute window rolls
  // forward without a refresh or extra subscription.
  const now = useNow(30000);

  const completedCutoff = now - COMPLETED_VISIBLE_MS;

  function ordersForColumn(status: OrderStatus) {
    if (status === "completed") {
      return orders.filter(
        (o) =>
          o.status === "completed" &&
          new Date(o.updated_at).getTime() >= completedCutoff,
      );
    }
    return orders.filter((o) => o.status === status);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">Live Orders</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              // Mute toggle is a user gesture — unlock audio here so chimes can play.
              const ctx = await ensureAudioContext(audioCtxRef);
              if (ctx) setAudioReady(true);

              // First click only unlocks; don't flip into muted.
              if (!audioReady) {
                void playChime(audioCtxRef);
                return;
              }

              setMuted((m) => {
                const next = !m;
                // Brief confirmation chirp when turning sound back on.
                if (!next && ctx) void playChime(audioCtxRef);
                return next;
              });
            }}
            aria-label={
              !audioReady
                ? "Enable order alert sounds"
                : muted
                  ? "Unmute order alerts"
                  : "Mute order alerts"
            }
            title={
              !audioReady
                ? "Click to enable order alert sounds"
                : muted
                  ? "Unmute order alerts"
                  : "Mute order alerts"
            }
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            {muted ? (
              // Speaker with X (muted)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M9.547 3.062A.75.75 0 0 1 10 3.75v12.5a.75.75 0 0 1-1.264.546L4.703 13H3.167a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 .75-.75h1.536l4.033-3.296a.75.75 0 0 1 .811-.142ZM13.78 7.22a.75.75 0 1 0-1.06 1.06L13.94 9.5l-1.22 1.22a.75.75 0 1 0 1.06 1.06L15 10.56l1.22 1.22a.75.75 0 1 0 1.06-1.06L16.06 9.5l1.22-1.22a.75.75 0 0 0-1.06-1.06L15 8.44l-1.22-1.22Z" />
              </svg>
            ) : (
              // Speaker with waves (unmuted)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h1.536l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899ZM13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
              </svg>
            )}
            {!audioReady ? "Enable Sound" : muted ? "Muted" : "Sound On"}
          </button>

          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-green-500" : "bg-zinc-300"
              }`}
            />
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>
      </header>

      <main className="flex flex-1 gap-4 overflow-x-auto p-4 [-webkit-overflow-scrolling:touch]">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            label={column.label}
            accent={column.accent}
            orders={ordersForColumn(column.status)}
            onAdvance={advanceOrder}
            newOrderIds={newOrderIds}
          />
        ))}
      </main>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  label,
  accent,
  orders,
  onAdvance,
  newOrderIds,
}: {
  label: string;
  accent: string;
  orders: Order[];
  onAdvance: (order: Order) => Promise<void>;
  newOrderIds: Set<string>;
}) {
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-200/60">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <h2 className="text-sm font-semibold text-zinc-700">{label}</h2>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">
          {orders.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-400">No orders</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={onAdvance}
              isNew={newOrderIds.has(order.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onAdvance,
  isNew,
}: {
  order: Order;
  onAdvance: (order: Order) => Promise<void>;
  isNew: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  // Initialize highlight from isNew so a freshly-mounted card starts highlighted.
  const [highlight, setHighlight] = useState(isNew);
  const shortOrderNumber = order.id.slice(-6).toUpperCase();
  const action = NEXT_ACTION[order.status];

  const now = useNow(15000);
  const showUrgency = URGENCY_STATUSES.has(order.status);
  const elapsedMinutes = minutesSince(order.updated_at, now);
  const urgency = showUrgency ? getUrgency(elapsedMinutes) : null;

  useEffect(() => {
    if (!isNew) return;
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 2000);
    return () => clearTimeout(t);
  }, [isNew]);

  async function handleClick() {
    setIsUpdating(true);
    try {
      await onAdvance(order);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <article
      className={`rounded-lg border bg-white p-3 shadow-sm transition-all duration-700 ${
        highlight
          ? "border-amber-400 shadow-amber-100 shadow-md ring-2 ring-amber-400"
          : urgency
            ? URGENCY_BORDER[urgency]
            : "border-zinc-200"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-zinc-900">
          Table {order.tables?.table_number ?? "?"}
        </span>
        <span className="text-xs text-zinc-400">
          {formatTime(order.created_at)}
          {urgency && (
            <span className={`ml-1 font-medium ${URGENCY_TEXT[urgency]}`}>
              · {formatElapsed(elapsedMinutes)}
            </span>
          )}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-zinc-400">#{shortOrderNumber}</p>

      <ul className="mt-2 space-y-1">
        {order.order_items.map((line) => (
          <li key={line.id} className="text-sm text-zinc-700">
            <span className="font-medium">{line.quantity}×</span>{" "}
            {line.menu_items?.name ?? "Unknown item"}
            {line.notes && (
              <span className="text-zinc-500"> — {line.notes}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-sm">
        <span className="text-zinc-500">Total</span>
        <span className="font-semibold text-zinc-900">
          {formatPrice(order.total_amount)}
        </span>
      </div>

      {action && (
        <button
          type="button"
          onClick={handleClick}
          disabled={isUpdating}
          className="mt-2 w-full rounded-md bg-brand-accent py-1.5 text-sm font-medium text-zinc-950 transition-[filter,opacity] hover:brightness-110 disabled:opacity-50"
        >
          {isUpdating ? "Updating…" : action.label}
        </button>
      )}
    </article>
  );
}

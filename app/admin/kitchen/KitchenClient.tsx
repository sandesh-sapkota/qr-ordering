"use client";

import type { MutableRefObject } from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { bumpKitchenOrder } from "@/app/actions/kitchen";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KitchenOrderStatus = "preparing";

export type KitchenOrder = {
  id: string;
  status: KitchenOrderStatus | string;
  created_at: string;
  updated_at: string;
  tables: { table_number: string } | null;
  order_items: {
    id: string;
    quantity: number;
    notes: string | null;
    menu_items: { name: string } | null;
  }[];
};

/** KDS only shows tickets after FOH taps Start Preparing on the orders board. */
const KDS_STATUSES = new Set(["preparing"]);

const ORDER_SELECT =
  "id, status, created_at, updated_at, tables(table_number), order_items(id, quantity, notes, menu_items(name))";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Elapsed since `iso` as "4m 20s" / "1h 02m" for kitchen glanceability. */
function formatElapsed(iso: string, now: number) {
  const totalSec = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 1000),
  );
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function urgencyTone(iso: string, now: number): "ok" | "warn" | "late" {
  const minutes = (now - new Date(iso).getTime()) / 60000;
  if (minutes >= 20) return "late";
  if (minutes >= 10) return "warn";
  return "ok";
}

async function ensureAudioContext(
  ctxRef: MutableRefObject<AudioContext | null>,
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
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running" ? ctx : null;
  } catch {
    return null;
  }
}

async function playChime(ctxRef: MutableRefObject<AudioContext | null>) {
  const ctx = await ensureAudioContext(ctxRef);
  if (!ctx) return;
  const audio = ctx;

  function strike(frequency: number, startTime: number, peakGain: number) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);
    osc.start(startTime);
    osc.stop(startTime + 1.0);
  }

  strike(784, audio.currentTime, 0.3);
  strike(523, audio.currentTime + 0.22, 0.24);
}

function sortKitchenOrders(orders: KitchenOrder[]) {
  return [...orders].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function isKitchenTicket(order: KitchenOrder | null | undefined): order is KitchenOrder {
  return Boolean(order && KDS_STATUSES.has(order.status));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function KitchenClient({
  restaurantId,
  restaurantName,
  initialOrders,
}: {
  restaurantId: string;
  restaurantName: string;
  initialOrders: KitchenOrder[];
}) {
  const [orders, setOrders] = useState<KitchenOrder[]>(() =>
    sortKitchenOrders(initialOrders),
  );
  const [connected, setConnected] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function unlock() {
      await ensureAudioContext(audioCtxRef);
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
    async function fetchOrder(orderId: string): Promise<KitchenOrder | null> {
      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId)
        .single();
      return data as unknown as KitchenOrder | null;
    }

    function upsertTicket(order: KitchenOrder) {
      if (!KDS_STATUSES.has(order.status)) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        return;
      }
      setOrders((prev) =>
        sortKitchenOrders([...prev.filter((o) => o.id !== order.id), order]),
      );
    }

    function flashNew(orderId: string) {
      setFlashIds((prev) => new Set([...prev, orderId]));
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 2200);
    }

    /** Arrive on KDS with highlight + chime (FOH sent to preparing). */
    function announceArrival(order: KitchenOrder, wasAlreadyOnBoard: boolean) {
      upsertTicket(order);
      if (wasAlreadyOnBoard) return;
      flashNew(order.id);
      void playChime(audioCtxRef);
    }

    const channel = supabase
      .channel(`kds-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          // New customer orders start as pending — stay off KDS until FOH prepares.
          const order = await fetchOrder(payload.new.id as string);
          if (!isKitchenTicket(order)) return;
          announceArrival(order, false);
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
          const updated = payload.new as { id: string; status: string };

          // Served / completed / cancelled / still New — leave the board.
          if (!KDS_STATUSES.has(updated.status)) {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
            return;
          }

          let wasAlreadyOnBoard = false;
          setOrders((prev) => {
            wasAlreadyOnBoard = prev.some((o) => o.id === updated.id);
            return prev;
          });

          const order = await fetchOrder(updated.id);
          if (isKitchenTicket(order)) {
            announceArrival(order, wasAlreadyOnBoard);
          } else {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          }
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
          const id = (payload.old as { id?: string })?.id;
          if (!id) return;
          setOrders((prev) => prev.filter((o) => o.id !== id));
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId]);

  async function handleBump(orderId: string) {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    const result = await bumpKitchenOrder(orderId);
    if (!result.ok) {
      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId)
        .single();
      const restored = data as unknown as KitchenOrder | null;
      if (isKitchenTicket(restored)) {
        setOrders((prev) =>
          sortKitchenOrders([
            ...prev.filter((o) => o.id !== orderId),
            restored,
          ]),
        );
      }
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-950 text-stone-50">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-stone-800 bg-stone-950/95 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400">
            Kitchen Display
          </p>
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            {restaurantName}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden items-center gap-2 text-sm text-stone-400 sm:flex">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-stone-600"
              }`}
            />
            {connected ? "Live" : "Connecting…"}
          </span>
          <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold tabular-nums text-amber-300 ring-1 ring-stone-700">
            {orders.length} active
          </span>
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-semibold text-stone-200 transition-colors hover:border-amber-500/50 hover:text-amber-300"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        {orders.length === 0 ? (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
            <p className="text-2xl font-semibold text-stone-300">
              No active tickets
            </p>
            <p className="mt-2 text-base text-stone-500">
              Tickets appear when staff taps Start Preparing on Orders
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
            {orders.map((order) => (
              <div key={order.id} className="mb-4 break-inside-avoid">
                <KitchenTicket
                  order={order}
                  isNew={flashIds.has(order.id)}
                  onBump={handleBump}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Ticket ───────────────────────────────────────────────────────────────────

function KitchenTicket({
  order,
  isNew,
  onBump,
}: {
  order: KitchenOrder;
  isNew: boolean;
  onBump: (orderId: string) => Promise<void>;
}) {
  const now = useNow(1000);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Timer starts when FOH sent the ticket to kitchen (status → preparing).
  const elapsed = formatElapsed(order.updated_at, now);
  const tone = urgencyTone(order.updated_at, now);

  const borderClass = isNew
    ? "border-amber-400 ring-2 ring-amber-400/60"
    : tone === "late"
      ? "border-red-400"
      : tone === "warn"
        ? "border-amber-400"
        : "border-stone-200";

  function handleBump() {
    setError(null);
    startTransition(async () => {
      try {
        await onBump(order.id);
      } catch {
        setError("Bump failed — try again");
      }
    });
  }

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border-2 bg-stone-50 text-stone-950 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-shadow ${borderClass}`}
    >
      <header className="flex items-start justify-between gap-3 bg-sky-600 px-4 py-3 text-white sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100">
            Table
          </p>
          <p className="truncate text-3xl font-black tracking-tight sm:text-4xl">
            {order.tables?.table_number ?? "?"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl">
            {elapsed}
          </p>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-sky-100">
            Preparing
          </p>
        </div>
      </header>

      <ul className="flex-1 space-y-3 px-4 py-4 sm:px-5 sm:py-5">
        {order.order_items.map((line) => (
          <li key={line.id}>
            <p className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              <span className="mr-2 inline-block min-w-[2ch] text-amber-600 tabular-nums">
                {line.quantity}×
              </span>
              {line.menu_items?.name ?? "Unknown item"}
            </p>
            {line.notes ? (
              <p className="mt-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-base font-semibold leading-snug text-amber-950 ring-1 ring-amber-300/80 sm:text-lg">
                {line.notes}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-stone-200 p-3 sm:p-4">
        {error ? (
          <p className="mb-2 text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleBump}
          disabled={pending}
          className="flex h-16 w-full items-center justify-center rounded-xl bg-emerald-500 text-xl font-black uppercase tracking-[0.12em] text-stone-950 shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-60 sm:h-20 sm:text-2xl"
        >
          {pending ? "Bumping…" : "Bump / Ready"}
        </button>
      </div>
    </article>
  );
}

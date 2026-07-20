"use client";

import { useEffect, useMemo, useState } from "react";
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
  "id, status, total_amount, created_at, tables(table_number), order_items(id, quantity, price_at_order_time, notes, menu_items(name))";

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
  const supabase = useMemo(() => createClient(), []);

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
          if (order) upsertOrder(order);
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
          };
          setOrders((prev) => {
            const existing = prev.find((o) => o.id === updated.id);
            if (!existing) return prev;
            return prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status, total_amount: updated.total_amount }
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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">Live Orders</h1>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-green-500" : "bg-zinc-300"
            }`}
          />
          {connected ? "Live" : "Connecting…"}
        </span>
      </header>

      <main className="flex flex-1 gap-4 overflow-x-auto p-4 [-webkit-overflow-scrolling:touch]">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            label={column.label}
            accent={column.accent}
            orders={orders.filter((o) => o.status === column.status)}
            onAdvance={advanceOrder}
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
}: {
  label: string;
  accent: string;
  orders: Order[];
  onAdvance: (order: Order) => Promise<void>;
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
            <OrderCard key={order.id} order={order} onAdvance={onAdvance} />
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
}: {
  order: Order;
  onAdvance: (order: Order) => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const shortOrderNumber = order.id.slice(-6).toUpperCase();
  const action = NEXT_ACTION[order.status];

  async function handleClick() {
    setIsUpdating(true);
    try {
      await onAdvance(order);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-zinc-900">
          Table {order.tables?.table_number ?? "?"}
        </span>
        <span className="text-xs text-zinc-400">{formatTime(order.created_at)}</span>
      </div>
      <p className="mt-0.5 text-xs text-zinc-400">#{shortOrderNumber}</p>

      <ul className="mt-2 space-y-1">
        {order.order_items.map((line) => (
          <li key={line.id} className="text-sm text-zinc-700">
            <span className="font-medium">{line.quantity}×</span>{" "}
            {line.menu_items?.name ?? "Unknown item"}
            {line.notes && (
              <span className="block pl-5 text-xs italic text-zinc-500">
                “{line.notes}”
              </span>
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
          className="mt-2 w-full rounded-md bg-zinc-900 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {isUpdating ? "Updating…" : action.label}
        </button>
      )}
    </article>
  );
}

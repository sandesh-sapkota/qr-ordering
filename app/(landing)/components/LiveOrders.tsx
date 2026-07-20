"use client";

// Interactive "live orders" dashboard mockup. Cards enter with a stagger and,
// every ~8s, a fresh order slides in at the top (via AnimatePresence) for a
// realistic "incoming orders" feel. Honors reduced motion by staying static.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { MockOrder, OrderStatus } from "./shared";

const VISIBLE = 4;
const INTERVAL_MS = 8000;

const STATUS_STYLES: Record<OrderStatus, { dot: string; pill: string; label: string }> = {
  new: {
    dot: "bg-amber-400",
    pill: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    label: "New",
  },
  preparing: {
    dot: "bg-sky-400",
    pill: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    label: "Preparing",
  },
  served: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    label: "Served",
  },
};

interface LiveOrder extends MockOrder {
  key: string;
}

interface LiveOrdersProps {
  orders: MockOrder[];
}

export default function LiveOrders({ orders }: LiveOrdersProps) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState<LiveOrder[]>(() =>
    orders.slice(0, VISIBLE).map((o, i) => ({ ...o, key: `${o.id}-${i}` })),
  );
  const tick = useRef(orders.length);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      const next = orders[tick.current % orders.length];
      const key = `${next.id}-${tick.current}`;
      tick.current += 1;
      const incoming: LiveOrder = {
        ...next,
        status: "new",
        minutesAgo: 0,
        key,
      };
      setVisible((prev) => [incoming, ...prev].slice(0, VISIBLE));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [orders, reduce]);

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-2xl shadow-black/40 backdrop-blur-xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className="relative flex h-2 w-2">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live orders · Table service
        </span>
      </div>

      <div className="space-y-2.5 p-4">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((order) => {
            const style = STATUS_STYLES[order.status];
            return (
              <motion.article
                key={order.key}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="rounded-2xl border border-white/5 bg-zinc-950/60 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      {order.table}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style.pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                    Rs {order.total.toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-xs text-zinc-400">
                  {order.items.join(" · ")}
                </p>
                <p className="mt-1 text-[11px] text-zinc-600 tabular-nums">
                  {order.minutesAgo === 0
                    ? "just now"
                    : `${order.minutesAgo}m ago`}
                </p>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

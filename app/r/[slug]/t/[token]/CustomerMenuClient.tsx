"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { placeOrder } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  display_order: number;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  category_id: string;
};

type CartLine = {
  item: MenuItem;
  quantity: number;
  notes: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return `Rs. ${Number(price).toFixed(2).replace(/\.00$/, "")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomerMenuClient({
  restaurantName,
  tableNumber,
  slug,
  token,
  categories,
  items,
}: {
  restaurantName: string;
  tableNumber: string;
  slug: string;
  token: string;
  categories: Category[];
  items: MenuItem[];
}) {
  const sessionKey = `order_id:${token}`;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isPlacing, startPlacing] = useTransition();

  // Restore the most recent order from this session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(sessionKey);
    if (stored) setActiveOrderId(stored);
  // sessionKey is derived from token which never changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(normalizedQuery) ||
        (i.description?.toLowerCase().includes(normalizedQuery) ?? false),
    );
  }, [items, normalizedQuery]);

  // Only show categories that actually contain matching available items
  const visibleCategories = useMemo(
    () =>
      categories.filter((c) =>
        filteredItems.some((i) => i.category_id === c.id),
      ),
    [categories, filteredItems],
  );

  const shownCategories = activeCategoryId
    ? visibleCategories.filter((c) => c.id === activeCategoryId)
    : visibleCategories;

  // If the active category has no search matches, fall back to All
  useEffect(() => {
    if (
      activeCategoryId &&
      !visibleCategories.some((c) => c.id === activeCategoryId)
    ) {
      setActiveCategoryId(null);
    }
  }, [activeCategoryId, visibleCategories]);

  const cartCount = useMemo(
    () => [...cart.values()].reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );

  const cartTotal = useMemo(
    () =>
      [...cart.values()].reduce(
        (sum, line) => sum + Number(line.item.price) * line.quantity,
        0,
      ),
    [cart],
  );

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(item.id);
      next.set(item.id, { item, quantity: (line?.quantity ?? 0) + 1, notes: line?.notes ?? "" });
      return next;
    });
  }

  function setItemNotes(itemId: string, notes: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(itemId);
      if (!line) return prev;
      next.set(itemId, { ...line, notes });
      return next;
    });
  }

  function decrementItem(itemId: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(itemId);
      if (!line) return prev;
      if (line.quantity <= 1) {
        next.delete(itemId);
      } else {
        next.set(itemId, { ...line, quantity: line.quantity - 1 });
      }
      return next;
    });
  }

  function handlePlaceOrder() {
    setCheckoutError(null);
    startPlacing(async () => {
      const result = await placeOrder({
        slug,
        token,
        items: [...cart.values()].map((line) => ({
          menuItemId: line.item.id,
          quantity: line.quantity,
          notes: line.notes,
        })),
      });

      if (result.ok) {
        sessionStorage.setItem(sessionKey, result.orderId);
        setActiveOrderId(result.orderId);
        setPlacedOrderId(result.orderId);
        setCart(new Map());
        setCartOpen(false);
      } else {
        setCheckoutError(result.error);
      }
    });
  }

  if (placedOrderId) {
    return (
      <OrderConfirmation
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        orderId={placedOrderId}
        onOrderAgain={() => setPlacedOrderId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Sticky top chrome: header + optional order bar + category tabs */}
      <div className="sticky top-0 z-20 bg-white">
        <header className="border-b border-zinc-200 px-4 py-3">
          <h1 className="text-lg font-semibold text-zinc-900">{restaurantName}</h1>
          <p className="text-sm text-zinc-500">Table {tableNumber}</p>
        </header>

        {activeOrderId && <OrderStatusBar orderId={activeOrderId} />}

        <div className="border-b border-zinc-200 px-4 py-2.5">
          <label className="relative block">
            <span className="sr-only">Search menu</span>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu…"
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 active:bg-zinc-100 active:text-zinc-600"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </label>
        </div>

        <nav className="border-b border-zinc-200">
          <div className="flex gap-2 overflow-x-auto px-4 py-2.5 [-webkit-overflow-scrolling:touch]">
            <CategoryTab
              label="All"
              active={activeCategoryId === null}
              onClick={() => setActiveCategoryId(null)}
            />
            {visibleCategories.map((c) => (
              <CategoryTab
                key={c.id}
                label={c.name}
                active={activeCategoryId === c.id}
                onClick={() => setActiveCategoryId(c.id)}
              />
            ))}
          </div>
        </nav>
      </div>

      {/* Menu grouped by category */}
      <main className="mx-auto max-w-lg px-4 py-4">
        {items.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            The menu is empty right now. Please ask the staff for assistance.
          </p>
        ) : shownCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No items match &ldquo;{searchQuery.trim()}&rdquo;.
          </p>
        ) : (
          shownCategories.map((category) => (
            <section key={category.id} className="mb-6">
              <h2 className="mb-3 text-base font-semibold text-zinc-900">{category.name}</h2>
              <div className="space-y-3">
                {filteredItems
                  .filter((i) => i.category_id === category.id)
                  .map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      quantity={cart.get(item.id)?.quantity ?? 0}
                      onAdd={() => addToCart(item)}
                      onRemove={() => decrementItem(item.id)}
                    />
                  ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white p-3">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setCartOpen(true)}
              className="flex w-full items-center justify-between rounded-xl bg-brand-accent px-5 py-3.5 text-zinc-950 active:brightness-110 transition-[filter]"
            >
              <span className="text-sm font-medium">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
              <span className="text-sm font-semibold">
                View Cart · {formatPrice(cartTotal)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <CartSheet
          lines={[...cart.values()]}
          total={cartTotal}
          isPlacing={isPlacing}
          error={checkoutError}
          onAdd={addToCart}
          onRemove={decrementItem}
          onNotesChange={setItemNotes}
          onPlaceOrder={handlePlaceOrder}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Category Tab ─────────────────────────────────────────────────────────────

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-accent text-zinc-950"
          : "bg-zinc-100 text-zinc-600 active:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  quantity,
  onAdd,
  onRemove,
}: {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3">
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-sm font-medium text-zinc-900">{item.name}</h3>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-semibold text-zinc-900">
            {formatPrice(item.price)}
          </span>
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-zinc-950 active:brightness-110 transition-[filter]"
            >
              Add
            </button>
          ) : (
            <QuantityStepper quantity={quantity} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quantity Stepper ─────────────────────────────────────────────────────────

function QuantityStepper({
  quantity,
  onAdd,
  onRemove,
}: {
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-brand-accent text-zinc-950">
      <button
        onClick={onRemove}
        aria-label="Remove one"
        className="px-3 py-2 text-base leading-none active:brightness-95 rounded-l-lg transition-[filter]"
      >
        −
      </button>
      <span className="min-w-5 text-center text-sm font-semibold">{quantity}</span>
      <button
        onClick={onAdd}
        aria-label="Add one"
        className="px-3 py-2 text-base leading-none active:brightness-95 rounded-r-lg transition-[filter]"
      >
        +
      </button>
    </div>
  );
}

// ─── Order Status Bar ─────────────────────────────────────────────────────────

type OrderStatus = "pending" | "preparing" | "served" | "completed" | "cancelled";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Received",
  preparing: "Preparing",
  served: "Served",
  completed: "Served",
  cancelled: "Cancelled",
};

function OrderStatusBar({ orderId }: { orderId: string }) {
  const status = useOrderStatus(orderId);
  const shortId = orderId.slice(-6).toUpperCase();
  const label = STATUS_LABEL[status] ?? "Received";
  const inProgress = status === "pending" || status === "preparing";

  const palette =
    status === "served" || status === "completed"
      ? "bg-green-50 border-green-200 text-green-800"
      : status === "preparing"
        ? "bg-blue-50 border-blue-200 text-blue-800"
        : status === "cancelled"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-medium ${palette}`}>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current ${inProgress ? "animate-pulse" : ""}`}
      />
      <span>
        Order #{shortId} — {label}
      </span>
    </div>
  );
}

// ─── Order Confirmation ───────────────────────────────────────────────────────


const STATUS_STEPS = [
  { label: "Received", statuses: ["pending"] },
  { label: "Preparing", statuses: ["preparing"] },
  { label: "Served", statuses: ["served", "completed"] },
] as const;

function stepIndexFor(status: OrderStatus): number {
  const index = STATUS_STEPS.findIndex((s) =>
    (s.statuses as readonly string[]).includes(status),
  );
  return index === -1 ? 0 : index;
}

function useOrderStatus(orderId: string): OrderStatus {
  const [status, setStatus] = useState<OrderStatus>("pending");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setStatus((payload.new as { status: OrderStatus }).status);
        },
      )
      .subscribe(async (subscribeStatus) => {
        // The status may have changed between insert and subscribing —
        // fetch once to catch up, then rely on Realtime alone.
        if (subscribeStatus !== "SUBSCRIBED") return;
        const { data } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .single();
        if (data) setStatus(data.status as OrderStatus);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId]);

  return status;
}

function OrderStatusSteps({ status }: { status: OrderStatus }) {
  const activeIndex = stepIndexFor(status);

  return (
    <div className="mt-8 w-full max-w-xs">
      <div className="flex items-start">
        {STATUS_STEPS.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={step.label} className="contents">
              {i > 0 && (
                <div
                  className={`mx-2 mt-4 h-0.5 flex-1 rounded transition-colors ${
                    i <= activeIndex ? "bg-green-600" : "bg-zinc-200"
                  }`}
                />
              )}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isDone || isActive
                      ? "bg-green-600 text-white"
                      : "bg-zinc-200 text-zinc-400"
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium ${
                    isDone || isActive ? "text-zinc-900" : "text-zinc-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderConfirmation({
  restaurantName,
  tableNumber,
  orderId,
  onOrderAgain,
}: {
  restaurantName: string;
  tableNumber: string;
  orderId: string;
  onOrderAgain: () => void;
}) {
  const shortOrderNumber = orderId.slice(-6).toUpperCase();
  const status = useOrderStatus(orderId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-7 w-7 text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="mt-4 text-lg font-semibold text-zinc-900">Order placed!</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {restaurantName} · Table {tableNumber}
      </p>
      <p className="mt-4 text-sm text-zinc-600">
        Order number
        <span className="mt-1 block text-2xl font-bold tracking-wider text-zinc-900">
          {shortOrderNumber}
        </span>
      </p>

      <OrderStatusSteps status={status} />

      <p className="mt-6 max-w-xs text-xs text-zinc-400">
        {status === "served" || status === "completed"
          ? "Enjoy your meal!"
          : "Please stay at your table — this page updates automatically as the kitchen works on your order."}
      </p>
      <button
        onClick={onOrderAgain}
        className="mt-8 rounded-xl bg-brand-accent px-6 py-3 text-sm font-medium text-zinc-950 active:brightness-110 transition-[filter]"
      >
        Order more
      </button>
    </div>
  );
}

// ─── Cart Sheet ───────────────────────────────────────────────────────────────

function CartSheet({
  lines,
  total,
  isPlacing,
  error,
  onAdd,
  onRemove,
  onNotesChange,
  onPlaceOrder,
  onClose,
}: {
  lines: CartLine[];
  total: number;
  isPlacing: boolean;
  error: string | null;
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onPlaceOrder: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">Your Cart</h2>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-lg p-1.5 text-zinc-500 active:bg-zinc-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">Your cart is empty.</p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 px-4">
              {lines.map(({ item, quantity, notes }) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                      <p className="text-xs text-zinc-500">
                        {formatPrice(item.price)} × {quantity}
                      </p>
                    </div>
                    <QuantityStepper
                      quantity={quantity}
                      onAdd={() => onAdd(item)}
                      onRemove={() => onRemove(item.id)}
                    />
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(item.id, e.target.value)}
                    placeholder="Special requests (e.g. no onion)"
                    maxLength={200}
                    rows={1}
                    className="mt-2 w-full resize-none rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                  />
                </li>
              ))}
            </ul>

            <div className="border-t border-zinc-200 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-600">Total</span>
                <span className="text-base font-semibold text-zinc-900">
                  {formatPrice(total)}
                </span>
              </div>
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                  {error}
                </p>
              )}
              <button
                onClick={onPlaceOrder}
                disabled={isPlacing}
                className="mt-3 w-full rounded-xl bg-brand-accent px-5 py-3.5 text-sm font-semibold text-zinc-950 active:brightness-110 transition-[filter,opacity] disabled:opacity-60"
              >
                {isPlacing ? "Placing order…" : "Place Order"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

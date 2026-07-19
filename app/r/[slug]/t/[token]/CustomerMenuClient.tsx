"use client";

import { useMemo, useState } from "react";

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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return `Rs. ${Number(price).toFixed(2).replace(/\.00$/, "")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomerMenuClient({
  restaurantName,
  tableNumber,
  categories,
  items,
}: {
  restaurantName: string;
  tableNumber: string;
  categories: Category[];
  items: MenuItem[];
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);

  // Only show categories that actually contain available items
  const visibleCategories = useMemo(
    () => categories.filter((c) => items.some((i) => i.category_id === c.id)),
    [categories, items],
  );

  const shownCategories = activeCategoryId
    ? visibleCategories.filter((c) => c.id === activeCategoryId)
    : visibleCategories;

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
      next.set(item.id, { item, quantity: (line?.quantity ?? 0) + 1 });
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

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">{restaurantName}</h1>
        <p className="text-sm text-zinc-500">Table {tableNumber}</p>
      </header>

      {/* Category Tabs */}
      <nav className="sticky top-[61px] z-10 border-b border-zinc-200 bg-white">
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

      {/* Menu grouped by category */}
      <main className="mx-auto max-w-lg px-4 py-4">
        {shownCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            The menu is empty right now. Please ask the staff for assistance.
          </p>
        ) : (
          shownCategories.map((category) => (
            <section key={category.id} className="mb-6">
              <h2 className="mb-3 text-base font-semibold text-zinc-900">{category.name}</h2>
              <div className="space-y-3">
                {items
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
              className="flex w-full items-center justify-between rounded-xl bg-zinc-900 px-5 py-3.5 text-white active:bg-zinc-700 transition-colors"
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
          onAdd={addToCart}
          onRemove={decrementItem}
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
          ? "bg-zinc-900 text-white"
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
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white active:bg-zinc-700 transition-colors"
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
    <div className="flex items-center gap-1 rounded-lg bg-zinc-900 text-white">
      <button
        onClick={onRemove}
        aria-label="Remove one"
        className="px-3 py-2 text-base leading-none active:bg-zinc-700 rounded-l-lg transition-colors"
      >
        −
      </button>
      <span className="min-w-5 text-center text-sm font-semibold">{quantity}</span>
      <button
        onClick={onAdd}
        aria-label="Add one"
        className="px-3 py-2 text-base leading-none active:bg-zinc-700 rounded-r-lg transition-colors"
      >
        +
      </button>
    </div>
  );
}

// ─── Cart Sheet ───────────────────────────────────────────────────────────────

function CartSheet({
  lines,
  total,
  onAdd,
  onRemove,
  onClose,
}: {
  lines: CartLine[];
  total: number;
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
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
              {lines.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
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
              <p className="mt-3 text-center text-xs text-zinc-400">
                Order placement is coming soon — please show your cart to the staff.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

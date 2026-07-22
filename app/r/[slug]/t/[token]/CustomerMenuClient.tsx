"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { placeOrder } from "@/app/actions/orders";
import { placeOrder as placeCustomerOrder } from "./actions";

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

type ModifierOption = {
  id: string;
  label: string;
  priceDelta: number;
};

type ModifierGroup = {
  id: string;
  label: string;
  type: "single" | "multi";
  required: boolean;
  options: ModifierOption[];
};

type SelectedModifier = {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  priceDelta: number;
};

type CartLine = {
  key: string;
  item: MenuItem;
  quantity: number;
  notes: string;
  modifiers: SelectedModifier[];
  unitPrice: number;
};

type StaffMemberOption = {
  id: string;
  name: string;
  role: string;
  auth_user_id: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  const n = Number(price);
  const rounded = Math.round(n * 100) / 100;
  return `Rs. ${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)}`;
}

/** Extract a clean display label from option name / label fields. */
function sanitizeOptionLabel(raw: unknown, fallback = "Option"): string {
  let value: unknown = raw;

  // Tolerate accidental nested shapes like { name: "Mild" }.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") value = obj.name;
    else if (typeof obj.label === "string") value = obj.label;
    else return fallback;
  }

  if (typeof value !== "string") {
    if (value == null) return fallback;
    value = String(value);
  }

  let s = (value as string)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !s ||
    s === "[object Object]" ||
    s.startsWith("{") ||
    s.startsWith("[")
  ) {
    return fallback;
  }

  // Reject junk like "l;11" — keep only readable menu labels.
  if (!/^[\p{L}\p{N}][\p{L}\p{N}\s\-'/&.()]*$/u.test(s)) {
    return fallback;
  }

  return s;
}

/** Price modifier badge text, or null when the badge should be hidden. */
function formatPriceModifier(delta: unknown): string | null {
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return null;
  const abs = Math.abs(Math.round(n * 100) / 100);
  const amount = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2);
  return n > 0 ? `+Rs. ${amount}` : `-Rs. ${amount}`;
}

function restaurantInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function defaultSelections(groups: ModifierGroup[]): SelectedModifier[] {
  const selected: SelectedModifier[] = [];
  for (const group of groups) {
    if (group.type !== "single") continue;
    // Required single-choice groups start with first option selected;
    // optional single-choice groups start empty until the customer picks.
    if (!group.required) continue;
    const option = group.options[0];
    if (!option) continue;
    selected.push({
      groupId: group.id,
      groupLabel: group.label,
      optionId: option.id,
      optionLabel: sanitizeOptionLabel(option.label),
      priceDelta: option.priceDelta,
    });
  }
  return selected;
}

function missingRequiredGroups(
  groups: ModifierGroup[],
  selections: SelectedModifier[],
): string[] {
  return groups
    .filter((g) => g.required)
    .filter((g) => !selections.some((s) => s.groupId === g.id))
    .map((g) => g.label);
}

function unitPriceFrom(item: MenuItem, modifiers: SelectedModifier[]) {
  return (
    Number(item.price) +
    modifiers.reduce((sum, m) => sum + m.priceDelta, 0)
  );
}

function cartKey(itemId: string, modifiers: SelectedModifier[]) {
  const modPart = [...modifiers]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join("|");
  return `${itemId}::${modPart}`;
}

function modifiersSummary(modifiers: SelectedModifier[]) {
  if (modifiers.length === 0) return "";
  return modifiers
    .map((m) => {
      const label = sanitizeOptionLabel(m.optionLabel);
      const badge = formatPriceModifier(m.priceDelta);
      return badge ? `${label} (${badge})` : label;
    })
    .join(" · ");
}

function buildOrderNotes(modifiers: SelectedModifier[], freeNotes: string) {
  const parts = [modifiersSummary(modifiers), freeNotes.trim()].filter(Boolean);
  return parts.join(" — ").slice(0, 200);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomerMenuClient({
  restaurantName,
  restaurantLogoUrl,
  tableNumber,
  slug,
  token,
  categories,
  items,
  modifierGroupsByItemId,
  staffMode = false,
  staffMembers = [],
  defaultStaffId = null,
  adminDisplayName = null,
}: {
  restaurantName: string;
  restaurantLogoUrl: string | null;
  tableNumber: string;
  slug: string;
  token: string;
  categories: Category[];
  items: MenuItem[];
  modifierGroupsByItemId: Record<string, ModifierGroup[]>;
  staffMode?: boolean;
  staffMembers?: StaffMemberOption[];
  defaultStaffId?: string | null;
  adminDisplayName?: string | null;
}) {
  const sessionKey = `order_id:${token}`;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);
  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isPlacing, startPlacing] = useTransition();
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    defaultStaffId ?? "",
  );
  const [staffToast, setStaffToast] = useState<string | null>(null);

  useEffect(() => {
    if (staffMode) return;
    const stored = sessionStorage.getItem(sessionKey);
    if (stored) setActiveOrderId(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!staffToast) return;
    const t = window.setTimeout(() => setStaffToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [staffToast]);

  function groupsFor(itemId: string): ModifierGroup[] {
    return modifierGroupsByItemId[itemId] ?? [];
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(normalizedQuery) ||
        (i.description?.toLowerCase().includes(normalizedQuery) ?? false),
    );
  }, [items, normalizedQuery]);

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
        (sum, line) => sum + line.unitPrice * line.quantity,
        0,
      ),
    [cart],
  );

  function quantityForItem(itemId: string) {
    return [...cart.values()]
      .filter((line) => line.item.id === itemId)
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  function addSimpleItem(item: MenuItem) {
    const key = cartKey(item.id, []);
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(key);
      next.set(key, {
        key,
        item,
        quantity: (line?.quantity ?? 0) + 1,
        notes: line?.notes ?? "",
        modifiers: [],
        unitPrice: Number(item.price),
      });
      return next;
    });
  }

  function addConfiguredItem(
    item: MenuItem,
    modifiers: SelectedModifier[],
    quantity: number,
    freeNotes: string,
  ) {
    const key = cartKey(item.id, modifiers);
    const unitPrice = Math.max(0, unitPriceFrom(item, modifiers));
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      next.set(key, {
        key,
        item,
        quantity: (existing?.quantity ?? 0) + quantity,
        notes: freeNotes.trim() || existing?.notes || "",
        modifiers,
        unitPrice,
      });
      return next;
    });
  }

  function handleAddTap(item: MenuItem) {
    const groups = groupsFor(item.id);
    if (groups.length > 0) {
      setCustomizing(item);
      return;
    }
    addSimpleItem(item);
  }

  function incrementLine(key: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(key);
      if (!line) return prev;
      next.set(key, { ...line, quantity: line.quantity + 1 });
      return next;
    });
  }

  function decrementLine(key: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(key);
      if (!line) return prev;
      if (line.quantity <= 1) next.delete(key);
      else next.set(key, { ...line, quantity: line.quantity - 1 });
      return next;
    });
  }

  function decrementSimpleItem(itemId: string) {
    const key = cartKey(itemId, []);
    decrementLine(key);
  }

  function setLineNotes(key: string, notes: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(key);
      if (!line) return prev;
      next.set(key, { ...line, notes });
      return next;
    });
  }

  function handlePlaceOrder() {
    setCheckoutError(null);

    if (staffMode && !selectedStaffId) {
      setCheckoutError(
        staffMembers.length === 0
          ? "Add an active staff member before taking orders."
          : "Select which staff member is taking this order.",
      );
      return;
    }

    startPlacing(async () => {
      const payload = [...cart.values()].map((line) => ({
        menuItemId: line.item.id,
        quantity: line.quantity,
        notes: buildOrderNotes(line.modifiers, line.notes),
        optionIds: line.modifiers.map((m) => m.optionId),
      }));

      const result = staffMode
        ? await placeOrder({
            slug,
            token,
            items: payload,
            staffId: selectedStaffId,
            orderSource: "waiter_pos",
          })
        : await placeCustomerOrder({
            slug,
            token,
            items: payload,
          });

      if (result.ok) {
        setCart(new Map());
        setCartOpen(false);
        if (staffMode) {
          setStaffToast(
            `Order #${result.orderId.slice(-6).toUpperCase()} placed for Table ${tableNumber}`,
          );
        } else {
          sessionStorage.setItem(sessionKey, result.orderId);
          setActiveOrderId(result.orderId);
          setPlacedOrderId(result.orderId);
        }
      } else {
        setCheckoutError(result.error);
      }
    });
  }

  if (placedOrderId && !staffMode) {
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
    <div
      className={`min-h-screen pb-28 text-zinc-900 ${
        staffMode ? "bg-amber-50" : "bg-[#f7f3ec]"
      }`}
    >
      {/* Sticky chrome */}
      <div
        className={`sticky top-0 z-20 border-b backdrop-blur-md ${
          staffMode
            ? "border-amber-200 bg-amber-100/95"
            : "border-amber-900/8 bg-[#f7f3ec]/95"
        }`}
      >
        {staffMode && (
          <div className="border-b border-amber-200/80 bg-amber-200/60 px-4 py-2">
            <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-amber-950">
              Staff Mode — Table {tableNumber}
            </p>
          </div>
        )}
        <header className="px-4 pb-2 pt-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm md:h-14 md:w-14">
              {restaurantLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={restaurantLogoUrl}
                  alt={`${restaurantName} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center bg-amber-50 text-sm font-bold text-amber-600 md:text-base"
                  aria-hidden
                >
                  {restaurantInitials(restaurantName)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
                {staffMode
                  ? `STAFF MODE - Table ${tableNumber}`
                  : restaurantName}
              </h1>
              <p className="mt-0.5 truncate text-xs text-slate-500 md:text-sm">
                {staffMode ? (
                  <>
                    {restaurantName}
                    <span className="mx-1.5 text-slate-300">•</span>
                    Waiter POS
                  </>
                ) : (
                  <>
                    Table {tableNumber}
                    <span className="mx-1.5 text-slate-300">•</span>
                    Digital Menu
                  </>
                )}
              </p>
            </div>
          </div>

          {staffMode && (
            <div className="mt-3">
              <label
                htmlFor="staff-member"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-amber-900/70"
              >
                Taking order as
              </label>
              {staffMembers.length === 0 ? (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  No active staff members found
                  {adminDisplayName ? ` (signed in as ${adminDisplayName})` : ""}
                  . Add staff members before placing waiter orders.
                </p>
              ) : (
                <select
                  id="staff-member"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                >
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.role ? ` (${s.role})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </header>

        {!staffMode && activeOrderId && (
          <OrderStatusBar orderId={activeOrderId} />
        )}

        <div className="px-4 pb-2.5">
          <label className="relative block">
            <span className="sr-only">Search menu</span>
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
              placeholder="Search dishes…"
              autoComplete="off"
              className="w-full rounded-2xl border border-zinc-200/80 bg-white py-3 pl-10 pr-10 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 active:bg-zinc-100 active:text-zinc-600"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </label>
        </div>

        <nav className="pb-3">
          <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <CategoryPill
              label="All"
              active={activeCategoryId === null}
              onClick={() => setActiveCategoryId(null)}
            />
            {visibleCategories.map((c) => (
              <CategoryPill
                key={c.id}
                label={c.name}
                active={activeCategoryId === c.id}
                onClick={() => setActiveCategoryId(c.id)}
              />
            ))}
          </div>
        </nav>
      </div>

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
            <section key={category.id} className="mb-7">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {category.name}
              </h2>
              <div className="space-y-3">
                {filteredItems
                  .filter((i) => i.category_id === category.id)
                  .map((item) => {
                    const groups = groupsFor(item.id);
                    const qty = quantityForItem(item.id);
                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        quantity={qty}
                        customizable={groups.length > 0}
                        onAdd={() => handleAddTap(item)}
                        onRemove={() => decrementSimpleItem(item.id)}
                        onOpenCustomize={() => setCustomizing(item)}
                      />
                    );
                  })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating order pill */}
      {cartCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-full bg-zinc-950 px-5 py-3.5 text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)] transition-[transform,filter] active:scale-[0.98] active:brightness-110"
          >
            <span className="text-sm font-medium">
              {staffMode ? "View Staff Order" : "View Order"} ({cartCount}{" "}
              {cartCount === 1 ? "item" : "items"})
            </span>
            <span className="text-sm font-semibold text-brand-accent">
              {formatPrice(cartTotal)}
            </span>
          </button>
        </div>
      )}

      {cartOpen && (
        <CartSheet
          lines={[...cart.values()]}
          total={cartTotal}
          isPlacing={isPlacing}
          error={checkoutError}
          staffMode={staffMode}
          onIncrement={incrementLine}
          onDecrement={decrementLine}
          onNotesChange={setLineNotes}
          onPlaceOrder={handlePlaceOrder}
          onClose={() => setCartOpen(false)}
        />
      )}

      {customizing && (
        <CustomizeSheet
          item={customizing}
          groups={groupsFor(customizing.id)}
          onAdd={(modifiers, quantity, freeNotes) => {
            addConfiguredItem(customizing, modifiers, quantity, freeNotes);
            setCustomizing(null);
          }}
          onClose={() => setCustomizing(null)}
        />
      )}

      {staffToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto max-w-sm rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
            {staffToast}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Category Pill ────────────────────────────────────────────────────────────

function CategoryPill({
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
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-950 text-white shadow-sm"
          : "bg-white text-zinc-600 ring-1 ring-zinc-200/80 active:bg-zinc-50"
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
  customizable,
  onAdd,
  onRemove,
  onOpenCustomize,
}: {
  item: MenuItem;
  quantity: number;
  customizable: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpenCustomize: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] ring-1 ring-zinc-950/5 ${
        customizable ? "cursor-pointer active:bg-zinc-50/80" : ""
      }`}
      onClick={customizable ? onOpenCustomize : undefined}
      onKeyDown={
        customizable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenCustomize();
              }
            }
          : undefined
      }
      role={customizable ? "button" : undefined}
      tabIndex={customizable ? 0 : undefined}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-22 w-22 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-amber-50 to-orange-100 text-2xl font-semibold text-amber-800/40">
              {item.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold leading-snug text-zinc-950">
              {item.name}
            </h3>
            {customizable && (
              <span className="mt-0.5 shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Options
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              {item.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="text-[15px] font-bold tabular-nums text-zinc-950">
              {formatPrice(item.price)}
            </span>

            {customizable || quantity === 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                aria-label={`Add ${item.name}`}
                className="grid h-9 w-9 place-items-center rounded-xl bg-brand-accent text-lg font-bold leading-none text-zinc-950 shadow-sm shadow-amber-500/25 transition-[filter,transform] active:scale-95 active:brightness-110"
              >
                +
              </button>
            ) : (
              <div onClick={(e) => e.stopPropagation()}>
                <QuantityStepper
                  quantity={quantity}
                  onAdd={onAdd}
                  onRemove={onRemove}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
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
    <div className="flex items-center rounded-xl bg-brand-accent text-zinc-950 shadow-sm shadow-amber-500/20">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove one"
        className="px-3 py-2 text-base leading-none transition-[filter] active:brightness-95"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add one"
        className="px-3 py-2 text-base leading-none transition-[filter] active:brightness-95"
      >
        +
      </button>
    </div>
  );
}

// ─── Customize Sheet ──────────────────────────────────────────────────────────

function CustomizeSheet({
  item,
  groups,
  onAdd,
  onClose,
}: {
  item: MenuItem;
  groups: ModifierGroup[];
  onAdd: (
    modifiers: SelectedModifier[],
    quantity: number,
    freeNotes: string,
  ) => void;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<SelectedModifier[]>(() =>
    defaultSelections(groups),
  );
  const [quantity, setQuantity] = useState(1);
  const [freeNotes, setFreeNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const unitPrice = Math.max(0, unitPriceFrom(item, selections));
  const lineTotal = unitPrice * quantity;

  function selectSingle(group: ModifierGroup, option: ModifierOption) {
    setValidationError(null);
    setSelections((prev) => {
      const without = prev.filter((s) => s.groupId !== group.id);
      return [
        ...without,
        {
          groupId: group.id,
          groupLabel: group.label,
          optionId: option.id,
          optionLabel: sanitizeOptionLabel(option.label),
          priceDelta: option.priceDelta,
        },
      ];
    });
  }

  function toggleMulti(group: ModifierGroup, option: ModifierOption) {
    setValidationError(null);
    setSelections((prev) => {
      const exists = prev.some(
        (s) => s.groupId === group.id && s.optionId === option.id,
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.groupId === group.id && s.optionId === option.id),
        );
      }
      return [
        ...prev,
        {
          groupId: group.id,
          groupLabel: group.label,
          optionId: option.id,
          optionLabel: sanitizeOptionLabel(option.label),
          priceDelta: option.priceDelta,
        },
      ];
    });
  }

  function isSelected(groupId: string, optionId: string) {
    return selections.some(
      (s) => s.groupId === groupId && s.optionId === optionId,
    );
  }

  function handleAdd() {
    const missing = missingRequiredGroups(groups, selections);
    if (missing.length > 0) {
      setValidationError(`Please choose: ${missing.join(", ")}`);
      return;
    }
    onAdd(selections, quantity, freeNotes);
  }

  return (
    <SheetShell onClose={onClose}>
      <div className="flex max-h-[88vh] flex-col">
        <div className="relative shrink-0">
          <div className="aspect-video w-full overflow-hidden bg-zinc-100">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-amber-50 to-orange-100 text-5xl font-semibold text-amber-800/35">
                {item.name.charAt(0)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm active:bg-black/60"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            {item.name}
          </h2>
          <p className="mt-1 text-base font-bold text-zinc-950">
            {formatPrice(item.price)}
          </p>
          {item.description && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {item.description}
            </p>
          )}

          <div className="mt-5 space-y-5">
            {groups.map((group) => (
              <fieldset key={group.id}>
                <legend className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  {group.label}
                  {group.required ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Required
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      Optional
                    </span>
                  )}
                </legend>
                <div className="space-y-2">
                  {group.options.map((option) => {
                    const selected = isSelected(group.id, option.id);
                    const priceBadge = formatPriceModifier(option.priceDelta);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          group.type === "single"
                            ? selectSingle(group, option)
                            : toggleMulti(group, option)
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-colors ${
                          selected
                            ? "bg-amber-50 ring-2 ring-brand-accent"
                            : "bg-zinc-50 ring-1 ring-zinc-200/80 active:bg-zinc-100"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`grid h-5 w-5 place-items-center border-2 ${
                              group.type === "single"
                                ? "rounded-full"
                                : "rounded-md"
                            } ${
                              selected
                                ? "border-brand-accent bg-brand-accent text-zinc-950"
                                : "border-zinc-300 bg-white"
                            }`}
                          >
                            {selected && (
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </span>
                          <span className="font-medium text-zinc-900">
                            {sanitizeOptionLabel(option.label)}
                          </span>
                        </span>
                        {priceBadge && (
                          <span className="text-sm font-medium tabular-nums text-slate-500">
                            {priceBadge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-zinc-900">
                Special requests
              </span>
              <textarea
                value={freeNotes}
                onChange={(e) => setFreeNotes(e.target.value)}
                placeholder="e.g. no onion, extra sauce"
                maxLength={120}
                rows={2}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {validationError && (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
              {validationError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-zinc-100 text-zinc-950">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="px-3.5 py-3 text-base leading-none active:opacity-70"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-bold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                aria-label="Increase quantity"
                className="px-3.5 py-3 text-base leading-none active:opacity-70"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-3.5 text-sm font-semibold text-zinc-950 shadow-sm shadow-amber-500/25 transition-[filter,transform] active:scale-[0.99] active:brightness-110"
            >
              Add to Order
              <span className="opacity-50">•</span>
              {formatPrice(lineTotal)}
            </button>
          </div>
        </div>
      </div>
    </SheetShell>
  );
}

// ─── Sheet Shell ──────────────────────────────────────────────────────────────

function SheetShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="menu-sheet-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/45"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="menu-sheet-panel w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-zinc-200" />
        </div>
        {children}
      </div>
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
      ? "bg-green-50 text-green-800"
      : status === "preparing"
        ? "bg-blue-50 text-blue-800"
        : status === "cancelled"
          ? "bg-red-50 text-red-700"
          : "bg-amber-50 text-amber-900";

  return (
    <div className={`mx-4 mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${palette}`}>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f3ec] px-6 text-center">
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
        type="button"
        onClick={onOrderAgain}
        className="mt-8 rounded-xl bg-brand-accent px-6 py-3 text-sm font-medium text-zinc-950 transition-[filter] active:brightness-110"
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
  staffMode = false,
  onIncrement,
  onDecrement,
  onNotesChange,
  onPlaceOrder,
  onClose,
}: {
  lines: CartLine[];
  total: number;
  isPlacing: boolean;
  error: string | null;
  staffMode?: boolean;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onNotesChange: (key: string, notes: string) => void;
  onPlaceOrder: () => void;
  onClose: () => void;
}) {
  return (
    <SheetShell onClose={onClose}>
      <div className="flex max-h-[80vh] flex-col">
        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <h2 className="text-base font-semibold text-zinc-900">
            {staffMode ? "Staff Order" : "Your Order"}
          </h2>
          <button
            type="button"
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
          <p className="py-12 text-center text-sm text-zinc-500">
            Your order is empty.
          </p>
        ) : (
          <>
            <ul className="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto px-4">
              {lines.map((line) => {
                const summary = modifiersSummary(line.modifiers);
                return (
                  <li key={line.key} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {line.item.name}
                        </p>
                        {summary && (
                          <p className="mt-0.5 text-xs text-zinc-500">{summary}</p>
                        )}
                        <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                          {formatPrice(line.unitPrice)} × {line.quantity}
                        </p>
                      </div>
                      <QuantityStepper
                        quantity={line.quantity}
                        onAdd={() => onIncrement(line.key)}
                        onRemove={() => onDecrement(line.key)}
                      />
                    </div>
                    <textarea
                      value={line.notes}
                      onChange={(e) => onNotesChange(line.key, e.target.value)}
                      placeholder="Special requests (e.g. no onion)"
                      maxLength={200}
                      rows={1}
                      className="mt-2 w-full resize-none rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                    />
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-zinc-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-600">Total</span>
                <span className="text-base font-bold tabular-nums text-zinc-900">
                  {formatPrice(total)}
                </span>
              </div>
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={isPlacing}
                className={`mt-3 w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition-[filter,opacity] active:brightness-110 disabled:opacity-60 ${
                  staffMode
                    ? "bg-amber-500 text-amber-950"
                    : "bg-brand-accent text-zinc-950"
                }`}
              >
                {isPlacing
                  ? "Placing order…"
                  : staffMode
                    ? "Place Staff Order"
                    : "Place Order"}
              </button>
            </div>
          </>
        )}
      </div>
    </SheetShell>
  );
}

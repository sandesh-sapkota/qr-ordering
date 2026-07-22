import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Nepal Standard Time — fixed UTC+5:45, no DST. */
export const NEPAL_TIMEZONE = "Asia/Kathmandu";

export type TopSoldItem = {
  menuItemId: string;
  itemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
};

export type DailyAnalytics = {
  /** Nepal calendar date (YYYY-MM-DD) used for the window. */
  nepalDate: string;
  /** Inclusive start of Nepal day, as UTC ISO string. */
  startIso: string;
  /** Inclusive end of Nepal day, as UTC ISO string. */
  endIso: string;
  totalRevenueToday: number;
  totalCompletedOrdersToday: number;
  topSoldItems: TopSoldItem[];
};

/**
 * Returns [start, end] of "today" in Asia/Kathmandu as UTC ISO strings
 * suitable for Postgres `created_at` range filters.
 */
export function getNepalDayBounds(now: Date = new Date()): {
  nepalDate: string;
  startIso: string;
  endIso: string;
} {
  const nepalDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Explicit +05:45 offset so bounds are correct regardless of server TZ.
  const startIso = new Date(`${nepalDate}T00:00:00+05:45`).toISOString();
  const endIso = new Date(`${nepalDate}T23:59:59.999+05:45`).toISOString();

  return { nepalDate, startIso, endIso };
}

type OrderItemAnalyticsRow = {
  menu_item_id: string;
  quantity: number;
  price_at_order_time: number;
  menu_items: { name: string } | null;
};

/**
 * Daily revenue / order count / top-5 sold items for a restaurant,
 * bounded to the current Nepal calendar day (Asia/Kathmandu).
 * Wrapped in React.cache() for request-level reuse across Server Components.
 */
export const getDailyAnalytics = cache(
  async (restaurantId: string): Promise<DailyAnalytics> => {
    const { nepalDate, startIso, endIso } = getNepalDayBounds();

    if (!restaurantId) {
      return {
        nepalDate,
        startIso,
        endIso,
        totalRevenueToday: 0,
        totalCompletedOrdersToday: 0,
        topSoldItems: [],
      };
    }

    const supabase = await createClient();

    const { data: completedOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_amount")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (ordersError) {
      throw new Error(`Failed to load daily orders: ${ordersError.message}`);
    }

    const orders = completedOrders ?? [];
    const totalCompletedOrdersToday = orders.length;
    const totalRevenuePaisa = orders.reduce(
      (sum, o) => sum + Math.round(Number(o.total_amount) * 100),
      0,
    );
    const totalRevenueToday = totalRevenuePaisa / 100;

    const orderIds = orders.map((o) => o.id);
    let topSoldItems: TopSoldItem[] = [];

    if (orderIds.length > 0) {
      // order_items has no restaurant_id — scope via completed order ids
      // already filtered by restaurant_id + Nepal day above.
      const { data: lines, error: linesError } = await supabase
        .from("order_items")
        .select("menu_item_id, quantity, price_at_order_time, menu_items(name)")
        .in("order_id", orderIds);

      if (linesError) {
        throw new Error(
          `Failed to load daily order items: ${linesError.message}`,
        );
      }

      const aggregates = new Map<
        string,
        { itemName: string; totalQuantitySold: number; totalRevenuePaisa: number }
      >();

      for (const line of (lines ?? []) as unknown as OrderItemAnalyticsRow[]) {
        const existing = aggregates.get(line.menu_item_id) ?? {
          itemName: line.menu_items?.name ?? "Unknown item",
          totalQuantitySold: 0,
          totalRevenuePaisa: 0,
        };

        const unitPaisa = Math.round(Number(line.price_at_order_time) * 100);
        existing.totalQuantitySold += line.quantity;
        existing.totalRevenuePaisa += unitPaisa * line.quantity;
        if (line.menu_items?.name) {
          existing.itemName = line.menu_items.name;
        }
        aggregates.set(line.menu_item_id, existing);
      }

      topSoldItems = [...aggregates.entries()]
        .map(([menuItemId, agg]) => ({
          menuItemId,
          itemName: agg.itemName,
          totalQuantitySold: agg.totalQuantitySold,
          totalRevenue: agg.totalRevenuePaisa / 100,
        }))
        .sort((a, b) => {
          if (b.totalQuantitySold !== a.totalQuantitySold) {
            return b.totalQuantitySold - a.totalQuantitySold;
          }
          return b.totalRevenue - a.totalRevenue;
        })
        .slice(0, 5);
    }

    return {
      nepalDate,
      startIso,
      endIso,
      totalRevenueToday,
      totalCompletedOrdersToday,
      topSoldItems,
    };
  },
);

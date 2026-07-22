"use server";

import {
  placeOrder as placeOrderAction,
  type PlaceOrderResult,
} from "@/app/actions/orders";

type CartItemInput = {
  menuItemId: string;
  quantity: number;
  notes?: string;
  /** Selected menu_item_options ids — prices recomputed server-side. */
  optionIds?: string[];
};

export type { PlaceOrderResult };

/**
 * Customer QR order entry point. Delegates to the shared placeOrder action
 * with order_source = qr_code (no staff attribution).
 */
export async function placeOrder(input: {
  slug: string;
  token: string;
  items: CartItemInput[];
}): Promise<PlaceOrderResult> {
  return placeOrderAction({
    slug: input.slug,
    token: input.token,
    items: input.items,
    orderSource: "qr_code",
  });
}

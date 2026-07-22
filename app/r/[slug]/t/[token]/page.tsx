import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/get-admin-context";
import CustomerMenuClient from "./CustomerMenuClient";

export default async function CustomerMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ staff?: string }>;
}) {
  const { slug, token } = await params;
  const { staff: staffParam } = await searchParams;
  const staffQuery = staffParam === "true";

  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .single();

  if (!restaurant) notFound();

  const { data: table } = await supabase
    .from("tables")
    .select("id, table_number, restaurant_id")
    .eq("qr_token", token)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!table) notFound();

  // Staff mode only when ?staff=true AND signed-in admin of this restaurant.
  // Random customers appending ?staff=true stay on the normal QR flow.
  let staffMode = false;
  let staffMembers: {
    id: string;
    name: string;
    role: string;
    auth_user_id: string | null;
  }[] = [];
  let defaultStaffId: string | null = null;
  let adminDisplayName: string | null = null;

  if (staffQuery) {
    const ctx = await getAdminContext();
    if (ctx && ctx.admin.restaurant_id === restaurant.id) {
      staffMode = true;
      adminDisplayName = ctx.admin.name ?? ctx.user.email ?? "Admin";

      const { data: staffRows } = await supabase
        .from("staff_members")
        .select("id, name, role, auth_user_id")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("name");

      staffMembers = staffRows ?? [];

      let linked = staffMembers.find((s) => s.auth_user_id === ctx.user.id);

      // Default to the logged-in admin: ensure they have an active staff row.
      if (!linked) {
        const staffRole =
          ctx.admin.role === "owner" ? "owner" : ("manager" as const);
        const { data: created } = await supabase
          .from("staff_members")
          .insert({
            restaurant_id: restaurant.id,
            auth_user_id: ctx.user.id,
            name: adminDisplayName,
            role: staffRole,
            passcode_pin: "0000",
            is_active: true,
          })
          .select("id, name, role, auth_user_id")
          .single();

        if (created) {
          staffMembers = [created, ...staffMembers];
          linked = created;
        }
      }

      defaultStaffId = linked?.id ?? staffMembers[0]?.id ?? null;
    }
  }

  const [{ data: categories }, { data: items }, { data: optionGroups }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, display_order")
        .eq("restaurant_id", restaurant.id)
        .order("display_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name, description, price, image_url, is_available, display_order, category_id",
        )
        .eq("restaurant_id", restaurant.id)
        .eq("is_available", true)
        .order("display_order"),
      supabase
        .from("menu_item_option_groups")
        .select(
          "id, menu_item_id, title, selection_type, is_required, display_order, menu_item_options(id, name, price_adjustment, display_order)",
        )
        .eq("restaurant_id", restaurant.id)
        .order("display_order"),
    ]);

  const modifierGroupsByItemId: Record<
    string,
    {
      id: string;
      label: string;
      type: "single" | "multi";
      required: boolean;
      options: { id: string; label: string; priceDelta: number }[];
    }[]
  > = {};

  for (const group of optionGroups ?? []) {
    // Only attach groups for available items on this menu.
    if (!(items ?? []).some((i) => i.id === group.menu_item_id)) continue;

    const options = (
      (group.menu_item_options ?? []) as {
        id: string;
        name: unknown;
        price_adjustment: unknown;
        display_order: number;
      }[]
    )
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((o) => {
        const rawName = (() => {
          // Prefer a plain string `name`; fall back through nested shapes.
          if (typeof o.name === "string") return o.name;
          if (o.name && typeof o.name === "object") {
            const nested = o.name as Record<string, unknown>;
            if (typeof nested.name === "string") return nested.name;
            if (typeof nested.label === "string") return nested.label;
          }
          return "";
        })();

        const label = rawName.replace(/\s+/g, " ").trim();
        const isClean =
          label.length > 0 &&
          /^[\p{L}\p{N}][\p{L}\p{N}\s\-'/&.()]*$/u.test(label);

        const priceDelta = Number(o.price_adjustment);
        return {
          id: o.id,
          label: isClean ? label : "Option",
          priceDelta: Number.isFinite(priceDelta) ? priceDelta : 0,
        };
      })
      .filter((o) => o.label.length > 0);

    if (options.length === 0) continue;

    const list = modifierGroupsByItemId[group.menu_item_id] ?? [];
    list.push({
      id: group.id,
      label: group.title,
      type: group.selection_type as "single" | "multi",
      required: group.is_required,
      options,
    });
    modifierGroupsByItemId[group.menu_item_id] = list;
  }

  return (
    <CustomerMenuClient
      restaurantName={restaurant.name}
      restaurantLogoUrl={restaurant.logo_url}
      tableNumber={table.table_number}
      slug={slug}
      token={token}
      categories={categories ?? []}
      items={items ?? []}
      modifierGroupsByItemId={modifierGroupsByItemId}
      staffMode={staffMode}
      staffMembers={staffMembers}
      defaultStaffId={defaultStaffId}
      adminDisplayName={adminDisplayName}
    />
  );
}

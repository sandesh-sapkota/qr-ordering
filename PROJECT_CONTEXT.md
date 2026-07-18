# QR-Based Table Ordering SaaS — MVP Architecture & Launch Plan

Straight talk up front: you can absolutely ship a working, pilot-ready MVP in 7 days. What you can't do in 7 days is ship a "production-ready, scalable SaaS" in the full sense — billing, multi-tenant onboarding, hardened auth, load testing. Those come after you have one restaurant actually using this.

One thing that changes the advice here more than anything else: Meromenu, NRestro, and RestroX already operate in this exact space in Nepal. This isn't a green field. That doesn't kill the idea — it validates that restaurants will adopt this pattern — but it changes what "MVP" needs to prove. This is not testing "will anyone want this," it's testing "will this specific restaurant switch to us over an incumbent or status quo."

## 1. Product Architecture

**Frontend**
- One Next.js app, two route groups: `/r/[restaurantSlug]/t/[tableToken]` for the customer-facing PWA (no login), and `/admin/*` for the restaurant dashboard (authenticated).
- Single codebase, single deploy. Splitting these into separate apps/repos is premature separation-of-concerns.
- Tailwind CSS for styling — fast to build, no design system overhead.
- PWA manifest so staff can "install" the admin dashboard to their home screen without an app store.

**Backend**
- No custom Express/Node API server for MVP. Use Supabase's auto-generated REST/RPC layer directly from the Next.js frontend, with Postgres Row-Level Security (RLS) doing authorization instead of hand-written middleware.
- Add a thin Next.js API route layer only where server-side logic is required that Supabase can't express cleanly (e.g., computing order totals server-side so a customer can't tamper with prices client-side). Everything else talks to Supabase directly.

**Database**
- PostgreSQL via Supabase. Relational fits this domain naturally — orders, tables, and menu items have real foreign-key relationships, and reporting queries (revenue by day, popular items) are painful in a NoSQL document store.

**Authentication**
- Customers: no auth at all. Identity comes from the QR code itself — a unique, unguessable token per table baked into the URL. Login screens for ordering food are one of the most common startup-killer decisions for this product category in low-friction markets like Nepali cafes.
- Admin/staff: Supabase Auth (email + password to start). One `admin_users` row links a Supabase auth user to a `restaurant_id`.

**API / data flow**
- Customer scans QR → lands on `/r/{slug}/t/{token}` → page fetches restaurant + menu from Supabase (public read, RLS-scoped) → customer builds cart client-side → on submit, order + order_items are inserted → Supabase Realtime pushes the new row to any admin dashboard subscribed to that restaurant's orders.
- Admin dashboard subscribes to a Postgres changes stream filtered by `restaurant_id`. No polling, no separate WebSocket server.

**Deployment**
- Frontend: Vercel (free tier is enough for one pilot restaurant's traffic).
- Backend/DB: Supabase Cloud (free tier: 500MB DB, enough for months of orders for a single-location cafe).
- Total infra cost for the pilot: $0/month.

## 2. Development Order (and why)

1. **DB schema + RLS policies** — everything else depends on this.
2. **Admin auth + login screen** — smallest slice that proves the full pipeline (Next.js → Supabase → deployed) works end-to-end. Deploy on day 1, not day 6.
3. **Menu management (CRUD)** — cannot build or test the customer ordering flow without real menu data sitting in the database. Comes before customer-facing work, not after.
4. **Table/QR generation** — needs restaurant + table records to exist, and needs to happen before testing the customer flow on an actual phone.
5. **Customer menu view + cart** — read-only at first (browse menu, add to cart in local state), no writes yet.
6. **Order placement (write path)** — cart → orders + order_items insert.
7. **Admin live order dashboard + Realtime** — the actual value proposition. Build after the write path exists — there's nothing to display otherwise.
8. **Order status flow** — pending → preparing → served → completed, staff can change status from the dashboard.
9. **End-to-end testing on real devices** — QR scan → order → dashboard update, on actual phones on actual WiFi, not just localhost.
10. **Deploy + one pilot restaurant.**

The through-line: build the thing that produces data before the thing that displays data.

## 3. Database Schema

Multi-tenancy from day one: every table (except pure lookup tables) carries `restaurant_id`. Retrofitting multi-tenancy later means touching every query in the app — do it now while it costs nothing.

| Table | Key Columns | Notes |
|---|---|---|
| `restaurants` | `id (uuid pk)`, `name`, `slug (unique)`, `phone`, `created_at` | One row per venue. `slug` is the human-readable part of the QR URL. |
| `admin_users` | `id (uuid pk, = supabase auth uid)`, `restaurant_id (fk)`, `name`, `role (owner/staff)`, `created_at` | Tie directly to Supabase Auth's user id — don't maintain a separate password column. |
| `tables` | `id (uuid pk)`, `restaurant_id (fk)`, `table_number`, `qr_token (unique, indexed)`, `created_at` | `qr_token` should be a random UUID, not a sequential table number. |
| `menu_categories` | `id (uuid pk)`, `restaurant_id (fk)`, `name`, `display_order` | e.g. "Momos", "Drinks", "Snacks". |
| `menu_items` | `id (uuid pk)`, `restaurant_id (fk)`, `category_id (fk)`, `name`, `description`, `price (numeric)`, `image_url`, `is_available (bool)`, `display_order` | `price` as `numeric(10,2)`, never `float`. |
| `orders` | `id (uuid pk)`, `restaurant_id (fk)`, `table_id (fk)`, `status (enum: pending/preparing/served/completed/cancelled)`, `total_amount (numeric)`, `created_at`, `updated_at` | Index on `(restaurant_id, status)` and `(restaurant_id, created_at)`. |
| `order_items` | `id (uuid pk)`, `order_id (fk)`, `menu_item_id (fk)`, `quantity`, `price_at_order_time (numeric)`, `notes` | Snapshot the price at order time — don't retroactively change past orders when a menu price changes. |

**Relationships:** one restaurant → many tables, many admin_users, many menu_categories → many menu_items, many orders. One order → many order_items. `table_id` on orders gives table-level order history for free later.

**Scalability notes for later, not now:** add `restaurant_id` to a composite RLS policy so Postgres itself enforces tenant isolation; consider a `restaurant_settings` table down the line for per-restaurant config (currency, tax %, printer integration) rather than adding columns to `restaurants` piecemeal.

## 4. UI/UX Design

**Customer flow (no login, mobile-first, assume a mid-range Android phone on patchy data):**
1. Menu screen — category tabs at top, item cards below (image, name, price, `+` button). Optimize images aggressively (WebP, lazy load).
2. Cart / review screen — quantity steppers, running total, "Add notes" field per item.
3. Order confirmation — table number + order number shown clearly.
4. *(Nice-to-have, cut if time-pressed)* — lightweight status view (pending → preparing → served).

**Admin dashboard:**
1. Login — email/password.
2. Live orders board — Kanban-style columns (New / Preparing / Served / Completed), updating in real time via Supabase subscriptions. This is the product from the restaurant's point of view.
3. Order detail — table, items, timestamps, one-tap status change buttons.
4. Menu management — add/edit/delete items and categories, toggle "sold out" instantly.
5. Table/QR management — generate and download printable QR codes per table.

**UX principles:**
- Large tap targets — staff phones are often older/budget Android with imprecise touchscreens.
- Works usably on 3G — don't assume the restaurant has fast WiFi.
- Zero training required for customers.
- Bilingual from the start (English + Nepali) — hardcode two string sets, don't build a full i18n framework.

## 5. Tech Stack Decision

| Option | Speed to MVP | Cost | Maintenance | Fit |
|---|---|---|---|---|
| **Next.js + Supabase** | Fastest | Free tier covers pilot | Low — one vendor, managed Postgres | **Recommended.** Relational schema fits the domain; built-in Realtime replaces a Socket.io server. |
| React + Node/Express + PostgreSQL | Slowest | Low, but self-managed DB host | Higher — own uptime for API server and DB | Right call after outgrowing Supabase's limits, not before. |
| Firebase (Firestore) | Fast to start | Free tier, scales expensively | Medium — NoSQL modeling for relational data gets awkward | Realtime is strong, but reporting queries ("today's revenue," "top-selling item") are painful in Firestore. |

**Decision: Next.js + Supabase**, deployed on Vercel + Supabase Cloud.

## 6. 7-Day MVP Plan

| Day | Goal | Build | Testing checkpoint |
|---|---|---|---|
| 1 | Full pipeline works end-to-end | Repo + Supabase project + schema + RLS; Next.js scaffold; deploy "hello world" to Vercel connected to Supabase | Deployed URL reads one row from the DB |
| 2 | Admin can log in and manage menu | Supabase Auth; admin_users/restaurants linkage; menu category + item CRUD | Log in, add a real menu item, see it persist |
| 3 | Real menu data + tables exist | Table creation + QR token generation + downloadable QR images; seed real pilot menu | Generate a QR for "Table 1," scan on a phone |
| 4 | Customer can browse | Customer menu screen by table token; cart state (client-side) | Scan QR → browse → add to cart → see total |
| 5 | Orders get placed | Order + order_items insert; confirmation screen; server-side total calculation | Place a real order; row appears in Supabase |
| 6 | Staff can see and act on orders live | Admin live board with Realtime; status change buttons | Order appears on a second device within ~1s |
| 7 | Pilot-ready | End-to-end test on real phones/WiFi; bug fixes; staff walkthrough | An untrained staff member can mark an order "served" |

End of day 7 = a working pilot for one restaurant, not a multi-tenant SaaS with self-serve signup/billing. That's the next sprint, after restaurant #1 proves people use it.

## 7. Business Validation

**Biggest risks, in order:** competitive displacement (incumbents already have relationships), adoption being a sales problem not a tech problem, thin margins/high price sensitivity in Nepali F&B, staff resistance, and the real calendar constraint of two founders in a final semester.

**Assumptions to validate with the pilot, not guess at:** will the owner pay recurring vs. wanting one-time cost; will customers actually use it vs. defaulting to waving down a waiter; is venue WiFi reliable at peak hours; does order-taking actually get faster or just move the bottleneck to the kitchen.

**First restaurant approach:** talk to 5–10 owners this week, in parallel with the build — favor smaller/newer places or venues outside Kathmandu Valley and college canteens, segments incumbents are less likely to have locked up. Get one to commit to a free pilot for feedback + testimonial.

**What makes a restaurant pay long-term:** measurable numbers — fewer staff needed at peak, faster table turnover, fewer mis-heard orders, later upsell prompts lifting average order value.

## 8. What NOT to Build (yet)

- No payment gateway integration (eSewa/Khalti/FonePay) — most small Nepali cafes still settle at the counter in cash.
- No native mobile app — a PWA avoids app store friction entirely.
- No Kitchen Display System, inventory, or analytics dashboards — premium features for later.
- No custom Node/Express backend.
- No full i18n framework — hardcode two language string sets.
- No multi-branch/franchise management — solve for one location until an owner asks for a second.

**Common mistakes to avoid:** building for imagined edge cases before validating the basic case; polishing branding before the ordering flow works end-to-end; picking stack pieces to learn rather than to ship fast; treating this like a graded assignment instead of a market test; waiting until the product is "done" to talk to restaurant owners.

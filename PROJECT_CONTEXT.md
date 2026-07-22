# QR-Based Table Ordering SaaS — Phase 2: Scalable Production Architecture

Straight talk up front: The 7-day MVP phase is complete. We proved the tech stack works end-to-end. Now, we are executing a 1–3 month roadmap to build a production-grade, scalable B2B platform. 

Meromenu, NRestro, and RestroX already operate in Nepal. Our wedge is not having more features than them—it is having a lightning-fast, zero-friction system that high-turnover cafes and college canteens can adopt in 10 minutes without staff confusion. To win, we must support how restaurants actually operate: hybrid QR + manual waiter ordering, daily financial accountability, and fast kitchen routing.

## 1. Product Architecture

**Frontend**
- Next.js App Router, two route groups: `/r/[restaurantSlug]/t/[tableToken]` (customer PWA) and `/admin/*` (authenticated dashboard).
- Tailwind CSS for styling.
- Vercel deployment strictly in `sin1` (Singapore) to minimize latency to Nepal.

**Backend**
- Supabase (PostgreSQL + Auth + Realtime). No custom Node/Express backend.
- Supabase project hosted in `ap-southeast-1` (Singapore).
- Server Actions and React `cache()` for data fetching and aggregation.

**Database & Multi-Tenancy**
- Strict relational PostgreSQL. Every operational table carries `restaurant_id`. 
- Multi-tenant from day one. RLS (Row Level Security) policies enforce isolation.

## 2. Updated Database Schema (Scale Phase)

| Table | Key Columns | Notes |
|---|---|---|
| `restaurants` | `id (uuid)`, `name`, `slug`, `phone`, `created_at` | One row per venue. |
| `admin_users` | `id (uuid = auth.uid)`, `restaurant_id`, `name`, `role`, `created_at` | Supabase Auth link for owners/managers. |
| `staff_members` | `id (uuid)`, `restaurant_id`, `name`, `role (enum: owner/manager/waiter/kitchen)`, `passcode_pin`, `is_active` | Floor staff for quick POS switching. |
| `tables` | `id`, `restaurant_id`, `table_number`, `qr_token (uuid)` | `qr_token` must be a random UUID. |
| `menu_categories` | `id`, `restaurant_id`, `name`, `display_order` | Category management. |
| `menu_items` | `id`, `restaurant_id`, `category_id`, `name`, `price (numeric 10,2)` | Core menu items. |
| `menu_item_variants`| `id`, `menu_item_id`, `name`, `price_override (numeric)` | Handles half/full, steam/fried, etc. |
| `orders` | `id`, `restaurant_id`, `table_id`, `status`, `total_amount (numeric)`, `created_by_staff_id`, `order_source (qr_code/waiter_pos)` | Tracks if customer or waiter placed it. |
| `order_items` | `id`, `order_id`, `menu_item_id`, `quantity`, `price_at_order_time (numeric)`, `notes` | Snapshot price. Do not join live prices. |

## 3. The 1–3 Month Milestone Plan

**Milestone 1: Staff POS Mode & Variants**
- Waiter / Staff manual order taking via dashboard or table token (`?staff=true`).
- Item variants (e.g., Momo: Steamed/Fried) and modifiers support.

**Milestone 2: Analytics & Reporting**
- Daily Revenue, Total Orders, and Top 5 Sold Items on the Dashboard.
- Aggregation strictly bounded to local Nepal timezone (`Asia/Kathmandu`).

**Milestone 3: Kitchen Display System (KDS)**
- High-contrast, read-only view for the kitchen (`/admin/kitchen`).
- Real-time bump buttons to advance order status.

## 4. UI/UX & Real-World Constraints
- **Speed over everything:** Must work usably on patchy 3G in Kathmandu.
- **Audio Alerts:** Admin Kanban must reliably trigger Web Audio API sounds for new orders.
- **Financial Precision:** All prices and totals are `numeric(10,2)`, never floats.

## 5. What NOT to Build (Deferred)
- No payment gateway integration (eSewa/Khalti) yet — cash at counter remains the default.
- No full inventory management (tracking raw materials like flour/oil).
- No native mobile app (PWA only).
- No multi-branch rollups (solve for single venues first).
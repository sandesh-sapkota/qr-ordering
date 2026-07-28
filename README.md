# SG Thali / QR Ordering

A working restaurant QR ordering platform built with Next.js and Supabase.

This repo includes the public landing page, restaurant admin dashboard, and customer-facing QR menu flow for table ordering. The app is built for a fast restaurant experience with live order updates, bilingual menu support, and a clean admin panel.

## What this app does

- Provides a marketing-style landing page and product pitch.
- Lets customers scan a table QR and place orders from their phone.
- Sends orders instantly to the restaurant dashboard using Supabase-powered realtime.
- Includes a protected admin area for managing menu items, categories, and tables.
- Supports staff mode for kitchen or waiter workflows via `?staff=true`.

## Main routes

- `/` - public landing page
- `/admin/login` - restaurant admin login
- `/admin/menu` - restaurant menu manager
- `/admin/orders` - live order view and kitchen dashboard
- `/admin/kitchen` - kitchen-facing order display
- `/r/[slug]/t/[token]` - customer menu for a restaurant table QR

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase Auth, Realtime, and Postgres
- `react-three/fiber` for landing page visuals
- `recharts` for dashboard analytics
- `react-qr-code` for QR generation

## Local setup

1. Copy environment variables into `.env.local`.
2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open the app at `http://localhost:3000`.

## Required environment variables

The app expects the following vars in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (recommended for email redirects and invite flows)

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by both client and server code. `SUPABASE_SERVICE_ROLE_KEY` is used by server-only superadmin actions.

## Database & Supabase notes

The project relies on Supabase tables such as:

- `restaurants`
- `admin_users`
- `staff_members`
- `tables`
- `menu_categories`
- `menu_items`
- `menu_item_option_groups`
- `menu_item_options`
- `menu_item_variants`
- `orders`
- `order_items`

There is also a `platform_admins` table for superadmin access.

## How the flow works

- Customers open `/r/[slug]/t/[token]` from a table QR code.
- The customer menu loads available categories and items for that restaurant.
- Orders are posted through server actions in `app/actions/orders.ts`.
- Admin users sign in through `/admin/login` and are routed to `/admin/menu` or `/superadmin/restaurants` depending on their role.

## Useful files

- `app/page.tsx` — landing page content and feature copy
- `app/layout.tsx` — root layout and metadata
- `app/r/[slug]/t/[token]/page.tsx` — customer menu page logic
- `app/admin/menu/page.tsx` — authenticated menu management
- `app/actions/auth.ts` — login, password reset, invite accept
- `app/actions/superadmin.ts` — restaurant creation and owner invite flow
- `lib/supabase/server.ts` — server-side Supabase client wrapper
- `lib/supabase/admin.ts` — service-role Supabase client
- `types/supabase.ts` — generated Supabase database types

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — build for production
- `npm run start` — start production server
- `npm run lint` — run ESLint

## Deployment

This project is ready for a typical Vercel deployment. Make sure the Supabase environment values are set in your deployment environment, and configure auth redirect URLs in Supabase to include your site origin.

## Notes

- The app uses Next.js server actions and Supabase auth across server and client.
- Customer orders are validated and priced server-side.
- Staff mode is enabled with `?staff=true`, but only when the signed-in admin belongs to the restaurant.

import type { Metadata } from "next";
import AuthHashRedirect from "./AuthHashRedirect";
import {
  DEMO_MENU_HREF,
  GET_PRICING_HREF,
  SECTION,
  fadeUp,
  scaleIn,
  staggerContainer,
  type Feature,
  type MockOrder,
  type Step,
} from "./(landing)/components/shared";
import { Reveal, StaggerGroup, StaggerItem, MotionLink } from "./(landing)/components/Reveal";
import { FeatureCard, StepIconGlyph } from "./(landing)/components/cards";
import AmbientOrbs from "./(landing)/components/AmbientOrbs";
import SiteHeader from "./(landing)/components/SiteHeader";
import Hero from "./(landing)/components/Hero";
import LiveOrders from "./(landing)/components/LiveOrders";

const SITE_URL = "https://sgthali.app";
const SITE_DESCRIPTION =
  "SG Thali lets restaurant guests scan a table QR, browse your menu in English or Nepali, and order in seconds — with every order landing live on your dashboard.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { absolute: "SG Thali — QR ordering for modern restaurants" },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "SG Thali — QR ordering for modern restaurants",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "SG Thali",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SG Thali — QR ordering for modern restaurants",
    description: SITE_DESCRIPTION,
  },
};

// --- Content ------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    icon: "qr",
    title: "Scan & order",
    description:
      "Guests scan the table QR and order straight from their phone. No app download, no account, no waiting to flag down a waiter.",
  },
  {
    icon: "realtime",
    title: "Orders land instantly",
    description:
      "Every order streams to your dashboard in under a second via realtime sync, so the kitchen never misses a ticket.",
  },
  {
    icon: "bilingual",
    title: "English & Nepali",
    description:
      "Show your full menu in both English and Nepali so every guest can order confidently in their own language.",
  },
  {
    icon: "menu",
    title: "Menu in your control",
    description:
      "Update prices, add dishes, or mark items sold out instantly. Changes go live on every table at once.",
  },
  {
    icon: "tables",
    title: "A QR for every table",
    description:
      "Generate and print a unique, unguessable QR code for each table in a couple of taps.",
  },
  {
    icon: "insights",
    title: "Know your service",
    description:
      "See active orders, table status, and prep times at a glance to keep every table moving.",
  },
];

const STEPS: Step[] = [
  {
    icon: "scan",
    title: "Scan",
    description:
      "Guest opens the camera, scans the table QR, and lands on your menu — no app, no signup.",
  },
  {
    icon: "order",
    title: "Order",
    description:
      "They browse in English or Nepali, add dishes, and tap Place order in a few seconds.",
  },
  {
    icon: "served",
    title: "Served",
    description:
      "The ticket appears live on your dashboard. You prep, serve, and keep the floor moving.",
  },
];

const MOCK_ORDERS: MockOrder[] = [
  {
    id: "o1",
    table: "Table 5",
    items: ["2× Steamed Momo", "1× Veg Thali"],
    total: 680,
    status: "new",
    minutesAgo: 1,
  },
  {
    id: "o2",
    table: "Table 2",
    items: ["1× Chicken Chowmein", "2× Masala Tea"],
    total: 420,
    status: "preparing",
    minutesAgo: 4,
  },
  {
    id: "o3",
    table: "Table 8",
    items: ["1× Chef's Thali Set", "1× Lassi"],
    total: 520,
    status: "preparing",
    minutesAgo: 6,
  },
  {
    id: "o4",
    table: "Table 1",
    items: ["3× Buff Momo", "1× Coke"],
    total: 610,
    status: "served",
    minutesAgo: 9,
  },
  {
    id: "o5",
    table: "Table 11",
    items: ["2× Veg Fried Rice", "1× Chicken Sekuwa"],
    total: 740,
    status: "new",
    minutesAgo: 2,
  },
  {
    id: "o6",
    table: "Table 4",
    items: ["1× Paneer Thali", "2× Fresh Lime"],
    total: 560,
    status: "served",
    minutesAgo: 12,
  },
];

// --- Page ---------------------------------------------------------------

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      <AuthHashRedirect />
      <AmbientOrbs />
      <SiteHeader />

      <main>
        <Hero />

        {/* How it works — Scan → Order → Served */}
        <section id="how-it-works" className={SECTION}>
          <Reveal variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Scan. Order. Served.
            </h2>
            <p className="mt-4 text-base text-zinc-400 sm:text-lg">
              Three steps for your guest. Zero friction for your floor.
            </p>
          </Reveal>

          <div className="relative mt-14 sm:mt-16">
            <div
              aria-hidden
              className="absolute left-[16.66%] right-[16.66%] top-6 hidden h-px bg-linear-to-r from-transparent via-brand-accent/40 to-transparent lg:block"
            />
            <StaggerGroup variants={staggerContainer}>
              <ol className="grid gap-12 lg:grid-cols-3 lg:gap-8">
                {STEPS.map((step) => (
                  <StaggerItem key={step.title} variants={fadeUp}>
                    <li className="flex flex-col items-center text-center">
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-brand-accent/30 bg-zinc-950 text-brand-accent shadow-lg shadow-brand-accent/10">
                        <StepIconGlyph name={step.icon} />
                      </span>
                      <h3 className="mt-5 text-lg font-semibold text-zinc-50">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-400">
                        {step.description}
                      </p>
                    </li>
                  </StaggerItem>
                ))}
              </ol>
            </StaggerGroup>
          </div>
        </section>

        {/* Built for Nepal */}
        <section id="built-for-nepal" className={SECTION}>
          <Reveal variants={fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
              Built for Nepal
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Not a generic international tool
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              SG Thali is made for how restaurants here actually run — bilingual
              menus in English and <span lang="ne">नेपाली</span>, light pages that
              still load on patchy WiFi, and a guest flow that needs no app
              download. Your customers already have a phone; that&apos;s enough.
            </p>
          </Reveal>
        </section>

        {/* See it live — real working demo */}
        <section id="demo" className={SECTION}>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <Reveal variants={fadeUp}>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
                See it live
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                Try the real guest menu
              </h2>
              <p className="mt-4 max-w-lg text-base text-zinc-400 sm:text-lg">
                Open a live table menu — the same experience your guests get
                after scanning a QR. Browse dishes, add to cart, and place a
                test order.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MotionLink href={DEMO_MENU_HREF}>Open live demo</MotionLink>
                <MotionLink href="/admin/login" variant="secondary">
                  Staff dashboard
                </MotionLink>
              </div>
            </Reveal>

            <Reveal variants={scaleIn}>
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  What your kitchen sees
                </p>
                <LiveOrders orders={MOCK_ORDERS} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className={SECTION}
          aria-labelledby="features-heading"
        >
          <Reveal variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2
              id="features-heading"
              className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl"
            >
              Everything a busy floor needs
            </h2>
            <p className="mt-4 text-base text-zinc-400 sm:text-lg">
              Purpose-built for restaurants and cafés that want faster tables and
              fewer mis-heard orders.
            </p>
          </Reveal>

          <StaggerGroup
            variants={staggerContainer}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.title} variants={scaleIn} className="h-full">
                <FeatureCard feature={feature} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        {/* Closing CTA */}
        <section className={SECTION}>
          <Reveal variants={scaleIn}>
            <div className="relative overflow-hidden rounded-3xl border border-brand-accent/20 bg-linear-to-br from-brand-accent/10 via-zinc-900 to-rose-500/10 px-6 py-14 text-center sm:px-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                Ready to turn tables faster?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-zinc-300 sm:text-lg">
                Get SG Thali running in your restaurant this week. We&apos;ll help
                you set up your first menu and QR codes.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <MotionLink
                  href={GET_PRICING_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book a free setup
                </MotionLink>
                <MotionLink href={DEMO_MENU_HREF} variant="secondary">
                  See it live
                </MotionLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand & Identity */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-slate-950">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3M20 14v.01M17 20h.01M20 17v4" />
                  </svg>
                </span>
                SG Thali
              </div>
              <p className="mt-4 text-sm leading-6">
                Real-time QR ordering and kitchen management for modern
                restaurants.
              </p>
              <p className="mt-3 text-sm">📍 Lalitpur, Nepal</p>
            </div>

            {/* Product Navigation */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Product</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-amber-400"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="transition-colors hover:text-amber-400"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="transition-colors hover:text-amber-400"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Portals & Contact */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Portals &amp; Contact
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a
                    href="/admin/login"
                    className="font-medium text-amber-400 transition-colors hover:text-amber-300"
                  >
                    Admin Login →
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact.sgthali@gmail.com"
                    className="transition-colors hover:text-amber-400"
                  >
                    contact.sgthali@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href={GET_PRICING_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-amber-400"
                  >
                    WhatsApp Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Legal</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a
                    href="/privacy"
                    className="transition-colors hover:text-amber-400"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="transition-colors hover:text-amber-400"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-footer */}
          <div className="mt-12 flex flex-col gap-2 border-t border-slate-900 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} SG Thali. All rights reserved.
            </p>
            <p className="sm:text-right">Engineered for Nepalese Hospitality.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

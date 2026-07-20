import type { Metadata } from "next";
import AuthHashRedirect from "./AuthHashRedirect";
import {
  fadeUp,
  scaleIn,
  staggerContainer,
  type Feature,
  type MockOrder,
  type PricingPlan,
  type Step,
} from "./(landing)/components/shared";
import { Reveal, StaggerGroup, StaggerItem, MotionLink } from "./(landing)/components/Reveal";
import { FeatureCard, PricingCard } from "./(landing)/components/cards";
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
    number: "01",
    title: "Set up your menu",
    description:
      "Add categories, dishes, prices and photos from the admin dashboard in minutes.",
  },
  {
    number: "02",
    title: "Print your table QRs",
    description:
      "Generate a unique QR code for each table and place it where guests can scan.",
  },
  {
    number: "03",
    title: "Serve in real time",
    description:
      "Orders appear live on your dashboard the moment a guest taps “Place order”.",
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

const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Pilot",
    price: "Rs 0",
    period: "/mo",
    description: "Free while you test SG Thali with one restaurant.",
    features: [
      "1 restaurant",
      "Unlimited tables & QR codes",
      "Live order dashboard",
      "English & Nepali menu",
    ],
    cta: "Start free",
    href: "/admin/login",
    highlighted: false,
  },
  {
    name: "Restaurant",
    price: "Rs 1,499",
    period: "/mo",
    description: "Everything you need to run daily table service.",
    features: [
      "Everything in Pilot",
      "Priority realtime sync",
      "Menu scheduling",
      "Email support",
    ],
    cta: "Get started",
    href: "mailto:hello@sgthali.app",
    highlighted: true,
  },
  {
    name: "Multi-branch",
    price: "Custom",
    period: "",
    description: "For groups running several venues.",
    features: [
      "Everything in Restaurant",
      "Multiple locations",
      "Consolidated reporting",
      "Dedicated onboarding",
    ],
    cta: "Talk to us",
    href: "mailto:hello@sgthali.app",
    highlighted: false,
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
        {/* Hero with lazy-loaded 3D scene */}
        <Hero />

        {/* Trust strip — honest positioning, not fabricated social proof */}
        <section
          aria-label="Why SG Thali"
          className="mx-auto max-w-6xl px-5 sm:px-8"
        >
          <Reveal variants={fadeUp}>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-white/5 py-6 text-sm font-medium text-zinc-400">
              {[
                "Built in Nepal",
                "Free pilot for your first restaurant",
                "No app for your guests",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {item}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                English &amp; <span lang="ne">नेपाली</span>
              </li>
            </ul>
          </Reveal>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Everything a busy floor needs
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
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

        {/* How it works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24"
        >
          <Reveal variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Live in three steps
            </h2>
          </Reveal>

          <div className="relative mt-16">
            {/* Desktop connector line between the step badges */}
            <div
              aria-hidden
              className="absolute left-[16.66%] right-[16.66%] top-6 hidden h-px bg-linear-to-r from-transparent via-amber-500/40 to-transparent lg:block"
            />
            <StaggerGroup variants={staggerContainer}>
              <ol className="grid gap-12 lg:grid-cols-3 lg:gap-8">
                {STEPS.map((step) => (
                  <StaggerItem key={step.number} variants={fadeUp}>
                    <li className="flex flex-col items-center text-center">
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-amber-500/30 bg-zinc-950 text-lg font-semibold text-amber-400 tabular-nums shadow-lg shadow-amber-500/10">
                        {step.number}
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

        {/* Demo — live orders dashboard */}
        <section
          id="demo"
          className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal variants={fadeUp}>
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
                Live demo
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                Watch orders arrive the moment guests tap order
              </h2>
              <p className="mt-4 max-w-lg text-lg text-zinc-400">
                This is your kitchen&apos;s view. New tickets stream in, statuses
                move from new to preparing to served, and nothing slips through
                the cracks — no polling, no refreshing.
              </p>
              <div className="mt-8">
                <MotionLink href="/admin/login">Open the dashboard</MotionLink>
              </div>
            </Reveal>

            <Reveal variants={scaleIn}>
              <LiveOrders orders={MOCK_ORDERS} />
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24"
        >
          <Reveal variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Simple pricing that scales with you
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Start free with your pilot restaurant. Upgrade when it earns its
              place.
            </p>
          </Reveal>

          <StaggerGroup
            variants={staggerContainer}
            className="mt-14 grid gap-6 lg:grid-cols-3"
          >
            {PRICING_PLANS.map((plan) => (
              <StaggerItem key={plan.name} variants={scaleIn} className="h-full">
                <PricingCard plan={plan} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal variants={scaleIn}>
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 via-zinc-900 to-rose-500/10 px-6 py-14 text-center sm:px-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                Ready to turn tables faster?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-300">
                Get SG Thali running in your restaurant this week. We&apos;ll help
                you set up your first menu and QR codes.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <MotionLink href="mailto:hello@sgthali.app">
                  Book a free setup
                </MotionLink>
                <MotionLink href="/admin/login" variant="secondary">
                  Admin login
                </MotionLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-zinc-950">
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
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <a
              href="#how-it-works"
              className="rounded transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="rounded transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              Pricing
            </a>
            <a
              href="mailto:hello@sgthali.app"
              className="rounded transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              hello@sgthali.app
            </a>
          </nav>
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} SG Thali
          </p>
        </div>
      </footer>
    </div>
  );
}

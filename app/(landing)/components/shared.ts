// Shared types and reusable Framer Motion variants for the landing page.
// Plain module (no "use client") so it can be imported by both the Server
// Component page and the client components.

import type { Variants } from "framer-motion";

export type OrderStatus = "new" | "preparing" | "served";

export interface MockOrder {
  id: string;
  table: string;
  items: string[];
  total: number;
  status: OrderStatus;
  minutesAgo: number;
}

export type IconKey =
  | "qr"
  | "realtime"
  | "bilingual"
  | "menu"
  | "tables"
  | "insights";

export type StepIcon = "scan" | "order" | "served";

export interface Feature {
  icon: IconKey;
  title: string;
  description: string;
}

export interface Step {
  icon: StepIcon;
  title: string;
  description: string;
}

/** Live guest-menu demo used by nav + “See it live” CTAs. */
export const DEMO_MENU_HREF =
  "/r/chiya-arambha/t/227cf850-c2eb-4e06-942f-5cf7450f9788";

/** WhatsApp chat for pricing inquiries — no tiers published on the site. */
export const GET_PRICING_HREF =
  "https://wa.me/9779749392634?text=" +
  encodeURIComponent("Hi! I'm interested in SG Thali for my restaurant.");

export const SECTION =
  "mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24";

// Soft ease — intentional, not bouncy.
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.04 },
  },
};

// Per-word entrance used by the hero headline.
export const wordUp: Variants = {
  hidden: { opacity: 0, y: "0.5em" },
  visible: {
    opacity: 1,
    y: "0em",
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

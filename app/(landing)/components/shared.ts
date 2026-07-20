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

export interface Feature {
  icon: IconKey;
  title: string;
  description: string;
}

export interface Step {
  number: string;
  title: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

// Cubic-bezier easing shared across reveals for a consistent, premium feel.
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

// Per-word entrance used by the hero headline.
export const wordUp: Variants = {
  hidden: { opacity: 0, y: "0.6em" },
  visible: {
    opacity: 1,
    y: "0em",
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

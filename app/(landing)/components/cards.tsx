"use client";

// Hover-reactive feature cards + step icons for the landing page.
// Reduced motion disables the lift.

import { motion, useReducedMotion } from "framer-motion";
import type { IconKey, Feature, StepIcon } from "./shared";

function Icon({ name }: { name: IconKey }) {
  const common = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
  switch (name) {
    case "qr":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M20 14v.01M17 20h.01M20 17v4" />
        </svg>
      );
    case "realtime":
      return (
        <svg {...common}>
          <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
        </svg>
      );
    case "bilingual":
      return (
        <svg {...common}>
          <path d="M4 5h7M9 3v2c0 4-2 7-5 8M5 9c0 2 2 4 5 5" />
          <path d="m13 21 4-9 4 9M14.5 17h5" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "tables":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 10v10" />
        </svg>
      );
    case "insights":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
  }
}

export function StepIconGlyph({ name }: { name: StepIcon }) {
  const common = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  switch (name) {
    case "scan":
      return (
        <svg {...common}>
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
      );
    case "order":
      return (
        <svg {...common}>
          <path d="M9 6h11l-1.5 9H8L6 3H3" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      );
    case "served":
      return (
        <svg {...common}>
          <path d="M12 3v10" />
          <path d="M8 7c0 4 4 6 4 6s4-2 4-6" />
          <path d="M6 21h12M9 17h6" />
        </svg>
      );
  }
}

export function FeatureCard({ feature }: { feature: Feature }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={
        reduce
          ? undefined
          : {
              y: -4,
              boxShadow: "0 16px 32px -16px rgba(245, 158, 11, 0.3)",
            }
      }
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group h-full rounded-2xl border border-white/10 bg-white/3 p-6 transition-colors hover:border-brand-accent/30"
    >
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent ring-1 ring-inset ring-brand-accent/20">
        <Icon name={feature.icon} />
      </div>
      <h3 className="text-base font-semibold text-zinc-50">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {feature.description}
      </p>
    </motion.div>
  );
}

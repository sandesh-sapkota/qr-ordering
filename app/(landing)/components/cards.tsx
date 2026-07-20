"use client";

// Hover-reactive cards (spring lift + amber glow) for the Features and Pricing
// sections, plus the inline icon set. Reduced motion disables the lift.

import { motion, useReducedMotion } from "framer-motion";
import type { IconKey, Feature, PricingPlan } from "./shared";
import { MotionLink } from "./Reveal";

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

export function FeatureCard({ feature }: { feature: Feature }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={
        reduce
          ? undefined
          : {
              y: -6,
              boxShadow: "0 20px 40px -16px rgba(245, 158, 11, 0.35)",
            }
      }
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-amber-500/30"
    >
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">
        <Icon name={feature.icon} />
      </div>
      <h3 className="text-base font-semibold text-zinc-50">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {feature.description}
      </p>
    </motion.div>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 flex-none text-amber-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`relative flex h-full flex-col rounded-3xl border p-8 ${
        plan.highlighted
          ? "border-amber-500/40 bg-linear-to-b from-amber-500/[0.08] to-transparent shadow-2xl shadow-amber-500/10"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-8 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-zinc-950">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-zinc-50">{plan.name}</h3>
      <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-semibold text-zinc-50 tabular-nums">
          {plan.price}
        </span>
        <span className="text-sm text-zinc-500">{plan.period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5 text-sm text-zinc-300">
            <Check />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <MotionLink
          href={plan.href}
          variant={plan.highlighted ? "primary" : "secondary"}
          className="w-full"
        >
          {plan.cta}
        </MotionLink>
      </div>
    </motion.div>
  );
}

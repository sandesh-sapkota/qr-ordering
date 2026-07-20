"use client";

// Reusable scroll-reveal and interactive-motion primitives.
// Every primitive honors prefers-reduced-motion via useReducedMotion.

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const VIEWPORT = { once: true, margin: "-80px" } as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
}

/** Fades/slides a block into view once, respecting reduced motion. */
export function Reveal({ children, className, variants, delay }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its <StaggerItem> children as they enter view. */
export function StaggerGroup({ children, className, variants }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child. Must be nested inside <StaggerGroup>. */
export function StaggerItem({ children, className, variants }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

interface MotionLinkProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  target?: string;
  rel?: string;
}

/** CTA anchor with hover lift, shimmer sweep and tap feedback. */
export function MotionLink({
  href,
  children,
  variant = "primary",
  className = "",
  target,
  rel,
}: MotionLinkProps) {
  const reduce = useReducedMotion();

  const base =
    "group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const styles =
    variant === "primary"
      ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20"
      : "border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 backdrop-blur-sm";

  return (
    <motion.a
      href={href}
      target={target}
      rel={rel}
      className={`${base} ${styles} ${className}`}
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
      {!reduce && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      )}
    </motion.a>
  );
}

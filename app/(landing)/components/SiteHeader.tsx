"use client";

// Sticky site header that gains a translucent background + shadow after the
// user scrolls past ~12px. Nav links have an underline-grow hover effect.

import { motion, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useState } from "react";
import { MotionLink } from "./Reveal";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
];

export default function SiteHeader() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = (latest: number) => setScrolled(latest > 12);
    update(scrollY.get());
    const unsubscribe = scrollY.on("change", update);
    return () => unsubscribe();
  }, [scrollY]);

  return (
    <motion.header
      initial={false}
      animate={{
        backgroundColor: scrolled
          ? "rgba(9, 9, 11, 0.72)"
          : "rgba(9, 9, 11, 0)",
        boxShadow: scrolled
          ? "0 1px 0 0 rgba(255,255,255,0.06), 0 10px 30px -10px rgba(0,0,0,0.6)"
          : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={reduce ? { duration: 0 } : { duration: 0.3 }}
      className={`fixed inset-x-0 top-0 z-50 ${
        scrolled ? "backdrop-blur-md" : ""
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="flex items-center gap-2 rounded text-base font-semibold tracking-tight text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30">
            <QrGlyph />
          </span>
          SG&nbsp;Thali
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative rounded text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/admin/login"
            className="hidden rounded text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 sm:inline-flex"
          >
            Admin login
          </a>
          <MotionLink href="#demo" className="h-10 px-5 text-sm">
            See it live
          </MotionLink>
        </div>
      </nav>
    </motion.header>
  );
}

function QrGlyph() {
  return (
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
  );
}

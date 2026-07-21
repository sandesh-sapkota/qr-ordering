"use client";

// Sticky site header that gains a translucent background + shadow after the
// user scrolls past ~12px. Nav links have an underline-grow hover effect.

import { motion, useReducedMotion, useScroll } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DEMO_MENU_HREF, GET_PRICING_HREF } from "./shared";
import { MotionLink } from "./Reveal";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "See it live", href: "#demo" },
  { label: "Get Pricing", href: GET_PRICING_HREF, external: true },
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
          className="flex items-center gap-2.5 rounded text-base font-semibold tracking-tight text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
        >
          <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-950 shadow-lg shadow-black/40 ring-1 ring-white/10">
            {/* Inset so the circular mark (bowl, S/G curves, QR) isn't clipped by the round mask */}
            <Image
              src="/landing/sg-thali-mark.png"
              alt=""
              width={36}
              height={36}
              className="h-[88%] w-[88%] object-contain"
              priority
            />
          </span>
          SG&nbsp;Thali
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group relative rounded text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brand-accent transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/admin/login"
            className="hidden rounded text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 sm:inline-flex"
          >
            Admin login
          </a>
          <MotionLink
            href={DEMO_MENU_HREF}
            className="hidden h-10 px-5 text-sm sm:inline-flex"
          >
            See it live
          </MotionLink>
        </div>
      </nav>
    </motion.header>
  );
}

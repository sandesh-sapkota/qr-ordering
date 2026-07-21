"use client";

// Hero section: staggered word-by-word headline, animated gradient phrase,
// CTA buttons, a masked grid backdrop and the lazy-loaded phone scene.

import { motion, useReducedMotion } from "framer-motion";
import { DEMO_MENU_HREF, staggerContainer, wordUp } from "./shared";
import { MotionLink } from "./Reveal";
import HeroScene from "./HeroScene";

interface Word {
  text: string;
  gradient?: boolean;
}

const HEADLINE: Word[] = [
  { text: "Turn" },
  { text: "every" },
  { text: "table" },
  { text: "into" },
  { text: "a" },
  { text: "self-serve", gradient: true },
  { text: "ordering", gradient: true },
  { text: "counter." },
];

const STATS: { value: string; label: string }[] = [
  { value: "<1s", label: "order sync" },
  { value: "2", label: "languages" },
  { value: "0", label: "apps to install" },
];

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-28 sm:px-8 sm:pb-24 lg:grid-cols-2 lg:gap-8 lg:pt-36"
    >
      <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
          QR ordering for modern restaurants
        </div>

        {reduce ? (
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl">
            Turn every table into a{" "}
            <span className="landing-gradient-text">self-serve ordering</span>{" "}
            counter.
          </h1>
        ) : (
          <motion.h1
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl"
          >
            {HEADLINE.map((word, i) => (
              <span
                key={i}
                className="mr-[0.25em] inline-flex overflow-hidden pb-[0.1em]"
              >
                <motion.span
                  variants={wordUp}
                  className={
                    word.gradient ? "landing-gradient-text" : undefined
                  }
                >
                  {word.text}
                </motion.span>
              </span>
            ))}
          </motion.h1>
        )}

        <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
          SG Thali lets guests scan, browse your menu in English or Nepali, and
          order in seconds — while every order lands live on your dashboard. No
          apps to install, no waiting, no missed tickets.
        </p>

        <p
          lang="ne"
          className="mt-4 text-sm font-medium tracking-wide text-amber-300"
        >
          स्क्यान गर्नुहोस् · अर्डर गर्नुहोस् · खानुहोस्
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 sm:mx-0 sm:flex-row">
          <MotionLink href={DEMO_MENU_HREF} className="w-full sm:w-auto">
            See it live
          </MotionLink>
          <MotionLink
            href="/admin/login"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Admin login
          </MotionLink>
        </div>

        <dl className="relative z-10 mb-12 mt-10 flex flex-wrap gap-x-8 gap-y-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-2xl font-semibold text-zinc-50 tabular-nums">
                {stat.value}
              </dt>
              <dd className="text-sm text-zinc-500">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative z-0 mx-auto w-full max-w-sm lg:max-w-none">
        <HeroScene />
      </div>
    </section>
  );
}

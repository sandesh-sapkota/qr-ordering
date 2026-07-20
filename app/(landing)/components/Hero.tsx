"use client";

// Hero section: staggered word-by-word headline, animated gradient phrase,
// CTA buttons, a masked grid backdrop and the lazy-loaded 3D scene.

import { motion, useReducedMotion } from "framer-motion";
import { staggerContainer, wordUp } from "./shared";
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
  { value: "Rs 0", label: "setup cost" },
  { value: "<1s", label: "order sync" },
  { value: "2", label: "languages" },
];

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-36"
    >
      <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
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

        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
          SG Thali lets guests scan, browse your menu in English or Nepali, and
          order in seconds — while every order lands live on your dashboard. No
          apps to install, no waiting, no missed tickets.
        </p>

        <p
          lang="ne"
          className="mt-4 text-sm font-medium tracking-wide text-amber-400/90"
        >
          स्क्यान गर्नुहोस् · अर्डर गर्नुहोस् · खानुहोस्
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <MotionLink href="#demo">See the live demo</MotionLink>
          <MotionLink href="/admin/login" variant="secondary">
            Admin login
          </MotionLink>
        </div>

        <dl className="mt-10 flex gap-8">
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

      <div className="relative">
        <HeroScene />
      </div>
    </section>
  );
}

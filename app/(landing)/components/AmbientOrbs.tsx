"use client";

// Fixed, non-interactive layer of softly drifting blurred gradient orbs.
// Purely decorative; skipped entirely when reduced motion is requested.

import { motion, useReducedMotion } from "framer-motion";

interface Orb {
  className: string;
  x: number[];
  y: number[];
  duration: number;
}

const ORBS: Orb[] = [
  {
    className:
      "left-[-10%] top-[-8%] h-[38rem] w-[38rem] bg-amber-500/20",
    x: [0, 60, 0],
    y: [0, 40, 0],
    duration: 22,
  },
  {
    className:
      "right-[-12%] top-[20%] h-[34rem] w-[34rem] bg-rose-500/15",
    x: [0, -50, 0],
    y: [0, 60, 0],
    duration: 26,
  },
  {
    className:
      "left-[25%] bottom-[-15%] h-[40rem] w-[40rem] bg-emerald-500/10",
    x: [0, 40, 0],
    y: [0, -40, 0],
    duration: 30,
  },
];

export default function AmbientOrbs() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {ORBS.map((orb, i) =>
        reduce ? (
          <div
            key={i}
            className={`absolute rounded-full blur-3xl ${orb.className}`}
          />
        ) : (
          <motion.div
            key={i}
            className={`absolute rounded-full blur-3xl ${orb.className}`}
            animate={{ x: orb.x, y: orb.y }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ),
      )}
    </div>
  );
}

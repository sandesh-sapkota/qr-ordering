"use client";

// Fixed, non-interactive layer of softly drifting blurred gradient orbs with
// a light scroll parallax so the backdrop never feels static.
// Skipped / static when reduced motion is requested.

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

interface Orb {
  className: string;
  x: number[];
  y: number[];
  duration: number;
  parallax: number;
}

const ORBS: Orb[] = [
  {
    className: "left-[-10%] top-[-8%] h-[38rem] w-[38rem] bg-brand-accent/20",
    x: [0, 48, 0],
    y: [0, 32, 0],
    duration: 24,
    parallax: 0.08,
  },
  {
    className: "right-[-12%] top-[20%] h-[34rem] w-[34rem] bg-rose-500/15",
    x: [0, -40, 0],
    y: [0, 48, 0],
    duration: 28,
    parallax: -0.06,
  },
  {
    className: "left-[25%] bottom-[-15%] h-[40rem] w-[40rem] bg-emerald-500/10",
    x: [0, 32, 0],
    y: [0, -32, 0],
    duration: 32,
    parallax: 0.1,
  },
];

function ParallaxOrb({ orb }: { orb: Orb }) {
  const { scrollY } = useScroll();
  const scrollShift = useTransform(scrollY, (v) => v * orb.parallax);

  return (
    <motion.div className="absolute inset-0" style={{ y: scrollShift }}>
      <motion.div
        className={`absolute rounded-full blur-3xl ${orb.className}`}
        animate={{ x: orb.x, y: orb.y }}
        transition={{
          duration: orb.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

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
          <ParallaxOrb key={i} orb={orb} />
        ),
      )}
    </div>
  );
}

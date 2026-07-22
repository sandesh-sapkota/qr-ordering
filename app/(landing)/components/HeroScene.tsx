"use client";

// Hero visual: static phone mockup with a soft pointer tilt —
// press/hover near an edge or corner and that side eases slightly back.

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useRef, type PointerEvent } from "react";

const CATEGORIES = ["Momo", "Thali", "Chowmein"] as const;

const MENU_ITEMS: { name: string; price: string }[] = [
  { name: "Steamed Momo", price: "Rs 180" },
  { name: "Veg Thali", price: "Rs 320" },
  { name: "Chicken Chowmein", price: "Rs 240" },
];

/** Max tilt in degrees — keep it subtle so it feels pleasant, not gimmicky. */
const MAX_TILT = 9;
/** How far the pressed side sinks toward the screen. */
const MAX_PUSH_Z = -18;

const springConfig = { stiffness: 180, damping: 22, mass: 0.6 };

function PhoneScreen() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[1.65rem] bg-zinc-950 sm:rounded-[1.85rem]">
      <div className="flex items-center justify-between px-4 pt-3.5 text-[10px] font-medium text-zinc-500 sm:px-5 sm:pt-4 sm:text-[11px]">
        <span>9:41</span>
        <span>SG Thali</span>
      </div>

      <h3 className="mt-3 px-4 text-[1.15rem] font-bold tracking-tight text-zinc-50 sm:mt-3.5 sm:px-5 sm:text-xl">
        Table 5 · Menu
      </h3>

      <div className="mx-4 mt-3.5 rounded-2xl bg-linear-to-r from-brand-accent to-rose-400 px-4 py-3.5 sm:mx-5 sm:mt-4 sm:px-5 sm:py-4">
        <p className="text-sm font-bold text-zinc-950 sm:text-[0.95rem]">
          Chef&apos;s Thali Set
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-zinc-900/75 sm:text-xs">
          Rice · Dal · 3 curries
        </p>
      </div>

      <div className="mt-3.5 flex gap-2 overflow-hidden px-4 sm:mt-4 sm:px-5">
        {CATEGORIES.map((label, i) => (
          <span
            key={label}
            className={
              i === 0
                ? "shrink-0 rounded-full bg-brand-accent px-3.5 py-1.5 text-[11px] font-semibold text-zinc-950 sm:text-xs"
                : "shrink-0 rounded-full bg-zinc-800 px-3.5 py-1.5 text-[11px] font-semibold text-zinc-400 sm:text-xs"
            }
          >
            {label}
          </span>
        ))}
      </div>

      <ul className="mt-3.5 flex flex-1 flex-col gap-2 overflow-hidden px-4 sm:mt-4 sm:gap-2.5 sm:px-5">
        {MENU_ITEMS.map((item) => (
          <li
            key={item.name}
            className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-2.5 py-2.5 sm:gap-3.5 sm:px-3 sm:py-3"
          >
            <span
              aria-hidden
              className="size-10 shrink-0 rounded-xl bg-zinc-800 sm:size-11"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-zinc-50 sm:text-[13px]">
                {item.name}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-brand-accent sm:text-xs">
                {item.price}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-800 text-sm font-bold text-brand-accent sm:size-9"
            >
              +
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto px-4 pb-2 pt-3 sm:px-5 sm:pb-2.5 sm:pt-3.5">
        <div className="rounded-full bg-brand-accent py-3 text-center text-[12px] font-bold text-zinc-950 sm:py-3.5 sm:text-[13px]">
          Place order · Rs 740
        </div>
      </div>

      <div className="flex justify-center pb-2.5 pt-1 sm:pb-3">
        <span
          aria-hidden
          className="h-1 w-24 rounded-full bg-zinc-600/80"
        />
      </div>
    </div>
  );
}

function PhoneMockup() {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const pushZ = useMotionValue(0);

  const springX = useSpring(rotateX, springConfig);
  const springY = useSpring(rotateY, springConfig);
  const springZ = useSpring(pushZ, springConfig);

  const transform = useMotionTemplate`perspective(900px) rotateX(${springX}deg) rotateY(${springY}deg) translateZ(${springZ}px)`;

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
    pushZ.set(0);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce || !frameRef.current) return;

    const rect = frameRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0 → 1
    const py = (e.clientY - rect.top) / rect.height;
    // -1 → 1 from center
    const x = px * 2 - 1;
    const y = py * 2 - 1;

    // Touched side / corner eases slightly into the screen.
    rotateX.set(-y * MAX_TILT);
    rotateY.set(x * MAX_TILT);
    // Stronger push when nearer an edge/corner than the center.
    const edge = Math.min(1, Math.hypot(x, y));
    pushZ.set(MAX_PUSH_Z * edge);
  }

  return (
    <div className="relative mx-auto w-full max-w-65 sm:max-w-75 [perspective:900px]">
      <div
        aria-hidden
        className="absolute inset-[8%] -z-10 rounded-[2.75rem] bg-brand-accent/30 blur-3xl"
      />

      <motion.div
        className="w-full"
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <motion.div
          ref={frameRef}
          className="relative touch-none rounded-[2.1rem] bg-brand-accent p-0.5 will-change-transform sm:rounded-[2.35rem]"
          style={{
            transform: reduce ? undefined : transform,
            transformStyle: "preserve-3d",
            boxShadow:
              "0 0 0 1px color-mix(in srgb, var(--brand-accent) 40%, transparent), 0 25px 50px -12px rgb(0 0 0 / 0.65)",
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
          onPointerUp={resetTilt}
          onPointerCancel={resetTilt}
        >
          <div className="rounded-[1.95rem] bg-zinc-950 p-1.75 sm:rounded-[2.2rem] sm:p-2">
            <div className="aspect-9/19 w-full">
              <PhoneScreen />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function HeroScene() {
  return (
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center py-4 lg:max-w-lg lg:py-2">
      <div
        aria-hidden
        className="landing-grid pointer-events-none absolute inset-0 rounded-3xl opacity-50"
      />
      <PhoneMockup />
    </div>
  );
}

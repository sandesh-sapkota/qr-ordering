"use client";

// Client-only wrapper that lazy-loads the r3f scene. It reserves a fixed box
// (CLS-safe), shows a lightweight CSS placeholder while the 3D bundle loads,
// and degrades to a static CSS mockup when WebGL is missing or the user
// prefers reduced motion. `next/dynamic({ ssr: false })` must live in a
// Client Component in Next 16.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => <CanvasPlaceholder pulse />,
});

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

// Respect the browser's Save-Data hint. Our real audience is on budget Android
// over patchy mobile data, so we skip the heavy 3D bundle when asked to.
function prefersReducedData(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return nav.connection?.saveData === true;
}

/** Amber-tinted placeholder occupying the exact 3D canvas footprint. */
function CanvasPlaceholder({ pulse = false }: { pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 grid place-items-center ${
        pulse ? "animate-pulse" : ""
      }`}
    >
      <div className="h-[62%] w-[42%] rounded-4xl border border-amber-500/20 bg-linear-to-b from-amber-500/10 to-rose-500/5 shadow-2xl shadow-amber-500/10" />
    </div>
  );
}

/** Static, dependency-free mockup for reduced-motion / no-WebGL fallback. */
function StaticFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center perspective-[1000px]">
      <div className="relative h-[70%] w-[44%] min-w-50 -rotate-6 rounded-4xl border border-white/10 bg-zinc-900 p-3 shadow-2xl shadow-amber-500/10 transform-3d">
        <div className="absolute -inset-px -z-10 rounded-4xl bg-linear-to-b from-amber-500/40 to-rose-500/20 blur-md" />
        <div className="flex h-full flex-col gap-3 rounded-[1.6rem] bg-linear-to-b from-zinc-950 to-black p-4">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>9:41</span>
            <span>SG Thali</span>
          </div>
          <div className="rounded-2xl bg-linear-to-r from-amber-500 to-rose-500 p-3 text-zinc-950">
            <p className="text-sm font-bold">Chef&apos;s Thali Set</p>
            <p className="text-[10px] font-medium">Rice · Dal · 3 curries</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-semibold text-zinc-950">
              Momo
            </span>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-semibold text-zinc-400">
              Thali
            </span>
          </div>
          <div className="flex-1 space-y-2">
            {["Steamed Momo", "Veg Thali", "Chicken Chowmein"].map((n) => (
              <div
                key={n}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 p-2"
              >
                <div className="h-9 w-9 rounded-lg bg-zinc-700" />
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-zinc-100">{n}</p>
                  <p className="text-[10px] font-bold text-amber-500">Rs 180</p>
                </div>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-800 text-amber-500">
                  +
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-linear-to-r from-amber-500 to-amber-400 py-2 text-center text-xs font-bold text-zinc-950">
            Place order · Rs 740
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroScene() {
  const reduce = useReducedMotion();
  const [webgl, setWebgl] = useState<"checking" | "ok" | "off">("checking");

  useEffect(() => {
    setWebgl(detectWebGL() && !prefersReducedData() ? "ok" : "off");
  }, []);

  const useStatic = reduce || webgl === "off";

  return (
    <div
      // Reserved footprint prevents layout shift as the scene mounts.
      className="relative mx-auto aspect-4/5 w-full max-w-md sm:aspect-square"
    >
      <div
        aria-hidden
        className="landing-grid pointer-events-none absolute inset-0 rounded-3xl opacity-60"
      />
      {useStatic ? (
        <StaticFallback />
      ) : webgl === "ok" ? (
        <HeroCanvas />
      ) : (
        <CanvasPlaceholder pulse />
      )}
    </div>
  );
}

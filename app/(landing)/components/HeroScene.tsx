"use client";

// Hero visual: floating WebP phone mockup by default (fast on mobile data).
// On capable desktop without Save-Data, progressively enhance with the 3D scene.

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => <PhoneMockup />,
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

function prefersReducedData(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return nav.connection?.saveData === true;
}

function isDesktopViewport(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

/** Soft vertical drift so the mockup feels alive, not static. */
function FloatWrap({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      className="h-full w-full"
      animate={{ y: [0, -8, 0] }}
      transition={{
        duration: 5.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

function PhoneMockup() {
  return (
    <FloatWrap>
      <div className="relative mx-auto flex h-full w-full max-w-70 items-center justify-center sm:max-w-80">
        <div
          aria-hidden
          className="absolute inset-[8%] -z-10 rounded-[2.5rem] bg-brand-accent/20 blur-2xl"
        />
        <Image
          src="/landing/phone-mockup.webp"
          alt="SG Thali guest menu on a phone — browse dishes and place an order"
          width={540}
          height={1080}
          sizes="(max-width: 640px) 260px, 320px"
          className="h-auto w-full drop-shadow-2xl"
          priority
        />
      </div>
    </FloatWrap>
  );
}

export default function HeroScene() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"image" | "3d">("image");

  useEffect(() => {
    const can3d =
      !reduce &&
      !prefersReducedData() &&
      isDesktopViewport() &&
      detectWebGL();
    setMode(can3d ? "3d" : "image");
  }, [reduce]);

  return (
    <div className="relative mx-auto aspect-4/5 w-full max-w-md sm:aspect-square">
      <div
        aria-hidden
        className="landing-grid pointer-events-none absolute inset-0 rounded-3xl opacity-60"
      />
      {mode === "3d" ? <HeroCanvas /> : <PhoneMockup />}
    </div>
  );
}

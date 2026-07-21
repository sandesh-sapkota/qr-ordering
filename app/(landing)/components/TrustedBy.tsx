import type { ReactNode } from "react";

const LOGOS = [
  {
    id: "sg-thali",
    name: "SG Thali",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M14 14h3v3M20 14v.01M17 20h.01M20 17v4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "himalayan-kitchen",
    name: "The Himalayan Kitchen",
    mark: (
      <svg viewBox="0 0 32 24" className="h-5 w-7 shrink-0" fill="none" aria-hidden>
        <path
          d="M2 20 L9 8 L14 14 L19 5 L30 20 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M19 5 L22 10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    ),
  },
  {
    id: "urban-cafe",
    name: "Urban Cafe",
    mark: (
      <svg viewBox="0 0 36 24" className="h-5 w-8 shrink-0" fill="none" aria-hidden>
        <path
          d="M2 20 V12 H6 V8 H10 V12 H14 V6 H18 V12 H22 V10 H26 V14 H30 V20 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M4 20 H32"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "thali-express",
    name: "Thali Express",
    mark: (
      <svg viewBox="0 0 28 24" className="h-5 w-6 shrink-0" fill="none" aria-hidden>
        <ellipse
          cx="14"
          cy="14"
          rx="11"
          ry="7"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="14" cy="13" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8.5" cy="13.5" r="1.4" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="19.5" cy="13.5" r="1.4" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="11.5" cy="17" r="1.1" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="16.5" cy="17" r="1.1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: "patan-bistro",
    name: "Patan Bistro",
    mark: (
      <svg viewBox="0 0 28 24" className="h-5 w-6 shrink-0" fill="none" aria-hidden>
        <path
          d="M14 3 L22 9 V20 H6 V9 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 3 L14 7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M10 20 V14 H18 V20"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M11 9.5 H17"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "brew-bites",
    name: "Brew & Bites",
    mark: (
      <svg viewBox="0 0 32 24" className="h-5 w-7 shrink-0" fill="none" aria-hidden>
        <path
          d="M6 8 H16 V16 C16 18.2 14.2 20 12 20 H10 C7.8 20 6 18.2 6 16 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M16 10 H18.5 C19.9 10 21 11.1 21 12.5 C21 13.9 19.9 15 18.5 15 H16"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <ellipse
          cx="25"
          cy="17"
          rx="4.5"
          ry="2.2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M9 5 C10 6.5 10 7.5 9 9 M12 5 C13 6.5 13 7.5 12 9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "valley-roast",
    name: "Valley Roast",
    mark: (
      <svg viewBox="0 0 28 24" className="h-5 w-6 shrink-0" fill="none" aria-hidden>
        <ellipse
          cx="14"
          cy="14"
          rx="7"
          ry="5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 14 C11.5 11.5 16.5 11.5 18 14 C16.5 16.5 11.5 16.5 10 14 Z"
          stroke="currentColor"
          strokeWidth="1.35"
        />
        <path
          d="M14 6 V9 M11 7 L13 9 M17 7 L15 9"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "street-plate",
    name: "Street Plate",
    mark: (
      <svg viewBox="0 0 36 24" className="h-5 w-8 shrink-0" fill="none" aria-hidden>
        <path
          d="M4 14 H8 L10 8 H26 L28 14 H32"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 8 V6 H18 V8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="26" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M14.2 17 H23.8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

function LogoItem({
  name,
  mark,
}: {
  name: string;
  mark: ReactNode;
}) {
  return (
    <li className="flex shrink-0 items-center">
      <span className="inline-flex cursor-pointer items-center gap-2.5 whitespace-nowrap text-slate-400 opacity-50 grayscale transition-all duration-300 hover:text-amber-400 hover:opacity-100 hover:grayscale-0">
        {mark}
        <span className="text-sm font-bold tracking-wider md:text-base">{name}</span>
      </span>
    </li>
  );
}

function LogoTrack({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <ul
      className="flex shrink-0 items-center gap-12 px-6 md:gap-16 md:px-8"
      aria-hidden={ariaHidden || undefined}
    >
      {LOGOS.map((logo) => (
        <LogoItem key={logo.id} name={logo.name} mark={logo.mark} />
      ))}
    </ul>
  );
}

export default function TrustedBy() {
  return (
    <section
      aria-label="Trusted by"
      className="border-y border-slate-800/60 bg-slate-950/50 py-8"
    >
      <p className="px-5 text-center text-xs font-semibold uppercase tracking-widest text-slate-500 sm:px-8">
        Trusted by forward-thinking restaurants &amp; cafes
      </p>

      <div
        className="group mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      >
        <div className="flex w-max animate-scroll-x-slow group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <LogoTrack />
          <LogoTrack ariaHidden />
        </div>
      </div>
    </section>
  );
}

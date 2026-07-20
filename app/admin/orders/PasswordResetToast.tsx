"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Shown once after a successful password reset (?password_reset=1). Strips
// the param from the URL immediately so a refresh doesn't re-show it, then
// auto-dismisses.
export default function PasswordResetToast() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    router.replace("/admin/orders", { scroll: false });
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs">
          ✓
        </span>
        Password updated successfully
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="ml-1 text-zinc-400 transition hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}

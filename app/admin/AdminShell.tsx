"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminNav from "./AdminNav";

/**
 * Authenticated admin chrome. Kitchen Display is full-screen — no sidebar/nav.
 */
export default function AdminShell({
  children,
  adminName,
  restaurantName,
  restaurantLogoUrl,
  isPlatformAdmin,
}: {
  children: ReactNode;
  adminName: string;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  isPlatformAdmin: boolean;
}) {
  const pathname = usePathname();
  const isKitchen = pathname === "/admin/kitchen" || pathname.startsWith("/admin/kitchen/");

  if (isKitchen) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 md:flex-row">
      <AdminNav
        adminName={adminName}
        restaurantName={restaurantName}
        restaurantLogoUrl={restaurantLogoUrl}
        isPlatformAdmin={isPlatformAdmin}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

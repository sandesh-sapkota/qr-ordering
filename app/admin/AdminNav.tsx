"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

type NavLink = { href: string; label: string };

const BASE_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/tables", label: "Tables" },
];

const SUPERADMIN_LINK: NavLink = {
  href: "/superadmin/restaurants",
  label: "Superadmin",
};

function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout} className={className}>
      <button
        type="submit"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        Log Out
      </button>
    </form>
  );
}

function RestaurantLogo({
  logoUrl,
  restaurantName,
  className,
}: {
  logoUrl: string | null;
  restaurantName: string;
  className: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Supabase
      // storage URL; matches how logos/menu images are rendered elsewhere.
      <img
        src={logoUrl}
        alt={`${restaurantName} logo`}
        className={`${className} shrink-0 rounded-lg border border-zinc-200 object-cover`}
      />
    );
  }
  // No logo uploaded — show the restaurant's initial as a placeholder.
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-brand-accent text-sm font-semibold text-zinc-950`}
    >
      {restaurantName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminNav({
  adminName,
  restaurantName,
  restaurantLogoUrl,
  isPlatformAdmin,
}: {
  adminName: string;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  isPlatformAdmin: boolean;
}) {
  const pathname = usePathname();
  const links = isPlatformAdmin ? [...BASE_LINKS, SUPERADMIN_LINK] : BASE_LINKS;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile: sticky top bar */}
      <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white md:hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <RestaurantLogo
              logoUrl={restaurantLogoUrl}
              restaurantName={restaurantName}
              className="h-9 w-9"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {restaurantName}
              </p>
              <p className="truncate text-xs text-zinc-500">{adminName}</p>
            </div>
          </div>
          <LogoutButton className="shrink-0" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pt-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "border-b-2 border-brand-accent text-brand-accent"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop: sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4">
          <RestaurantLogo
            logoUrl={restaurantLogoUrl}
            restaurantName={restaurantName}
            className="h-10 w-10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {restaurantName}
            </p>
            <p className="truncate text-xs text-zinc-500">{adminName}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-brand-accent text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LogoutButton className="border-t border-zinc-100 p-3" />
      </aside>
    </>
  );
}

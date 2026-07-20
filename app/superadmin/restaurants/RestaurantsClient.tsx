"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createRestaurant,
  type SuperadminActionState,
} from "@/app/actions/superadmin";
import { slugify } from "@/lib/slug";

export type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  tableCount: number;
  adminCount: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RestaurantsClient({
  restaurants,
  loadError,
}: {
  restaurants: RestaurantRow[];
  loadError: string | null;
}) {
  const [state, action, pending] = useActionState<
    SuperadminActionState,
    FormData
  >(createRestaurant, undefined);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Once the user hand-edits the slug we stop auto-deriving it from the name,
  // so their intent isn't clobbered on the next keystroke.
  const [slugTouched, setSlugTouched] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Build/revoke an object URL preview whenever the chosen file changes.
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function handleLogoFileChange(file: File | null) {
    setLogoFile(file);
    // A chosen file takes priority server-side, so clear the URL field to
    // avoid implying both are in effect.
    if (file) setLogoUrl("");
  }

  // Clear the form after a successful insert. The server action revalidates
  // the list, so the new row arrives via a fresh server render.
  useEffect(() => {
    if (state && state.error === null) {
      setName("");
      setSlug("");
      setPhone("");
      setAddress("");
      setLogoUrl("");
      setLogoFile(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
      setSlugTouched(false);
      formRef.current?.reset();
    }
  }, [state]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ─── Restaurant list ─────────────────────────────────────────── */}
        <section className="order-2 lg:order-1">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            All Restaurants{" "}
            <span className="font-normal text-zinc-400">
              ({restaurants.length})
            </span>
          </h2>

          {loadError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              Failed to load restaurants: {loadError}
            </p>
          )}

          {restaurants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-400">
              No restaurants yet. Add the first one.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Slug</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tables</th>
                    <th className="px-4 py-2.5 text-right font-medium">Admins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {restaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 font-medium">
                        <Link
                          href={`/superadmin/restaurants/${r.id}`}
                          className="text-zinc-900 underline-offset-2 hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                          {r.slug}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                        {r.tableCount}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                        {r.adminCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── Add restaurant form ─────────────────────────────────────── */}
        <section className="order-1 lg:order-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              Add Restaurant
            </h2>
            <form ref={formRef} action={action} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Restaurant name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  placeholder="Himalayan Momo House"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="slug"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Slug
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  onBlur={() => setSlug((s) => slugify(s))}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  placeholder="himalayan-momo-house"
                />
                <p className="text-xs text-zinc-400">
                  Auto-generated from the name; edit if needed. URL:{" "}
                  <span className="text-zinc-500">
                    /r/{slug || "your-slug"}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Phone{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  placeholder="+977 98XXXXXXXX"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Address{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  placeholder="Thamel, Kathmandu"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="logo_file"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Logo{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-12 w-12 shrink-0 rounded-lg border border-zinc-200 object-cover"
                    />
                  )}
                  <input
                    ref={logoFileInputRef}
                    id="logo_file"
                    name="logo_file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) =>
                      handleLogoFileChange(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
                  />
                </div>
                <p className="text-xs text-zinc-400">
                  Upload from your computer (PNG/JPEG/WebP/GIF, max 2MB), or
                  paste a URL below instead.
                </p>
                <input
                  id="logo_url"
                  name="logo_url"
                  type="url"
                  value={logoUrl}
                  disabled={!!logoFile}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:bg-zinc-50 disabled:text-zinc-400"
                  placeholder="https://…"
                />
              </div>

              {state?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add Restaurant"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

// Turns arbitrary text into a URL-safe slug: lowercase, ASCII, hyphen-separated.
// Used both client-side (live preview as the user types) and server-side
// (final normalization before insert) so the two never disagree.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics become hyphens
    .replace(/-{2,}/g, "-") // collapse repeats
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

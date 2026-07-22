import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Service-role client — bypasses RLS and can call the Auth Admin API
// (inviteUserByEmail, etc). The service role key is read from a non-public env
// var (no NEXT_PUBLIC_ prefix), so Next.js never inlines it into a client
// bundle. Only ever import this from Server Actions or Route Handlers.
export function createAdminClient() {
  // Defense in depth: a service-role client must never run in the browser.
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must only be called on the server.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never prefix it with NEXT_PUBLIC_).",
    );
  }

  // This client is short-lived and stateless: it never handles a browser
  // session, so disable session persistence and token refresh.
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

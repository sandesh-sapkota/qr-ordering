"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Supabase sometimes lands invite/recovery links on Site URL (/) with tokens
// in the hash instead of /auth/accept-invite. Forward those here so the accept
// flow can establish the session.
export default function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const type = params.get("type");
    const hasSession =
      params.has("access_token") || params.has("error_description");

    if (hasSession && (type === "invite" || type === "recovery" || !type)) {
      router.replace(`/auth/accept-invite${hash}`);
    }
  }, [router]);

  return null;
}

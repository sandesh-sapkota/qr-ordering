import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles the link from the invite (and other) emails. Supabase sends the user
// here with a `token_hash` + `type`, which we exchange for a real session
// (setting the auth cookies) before forwarding them to `next`. Keeping this
// server-side means the session lands in httpOnly cookies rather than a URL
// fragment. Point your invite email template at:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/accept-invite
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only allow same-origin relative paths for `next` to avoid open redirects.
  const nextParam = searchParams.get("next") ?? "/auth/accept-invite";
  const next = nextParam.startsWith("/") ? nextParam : "/auth/accept-invite";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.search = "";

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(redirectTo);
  } else if (code) {
    // PKCE fallback, in case the project issues a code instead.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/auth/auth-code-error";
  return NextResponse.redirect(redirectTo);
}

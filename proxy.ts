import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /admin routes; login and forgot-password are public.
  // /admin/reset-password stays guarded on purpose — it requires the session
  // established by the recovery-link exchange in /auth/confirm.
  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicPage =
    pathname === "/admin/login" || pathname === "/admin/forgot-password";

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Build a response we can write refreshed session cookies onto
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser() validates the JWT with Supabase — never trust getSession() alone
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated user on any guarded /admin page → send to login
  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all /admin paths, skip static assets
    "/admin/:path*",
  ],
};

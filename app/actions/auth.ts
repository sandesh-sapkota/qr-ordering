"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState =
  | { error: string }
  | { error: null }
  | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !user) {
    return { error: "Invalid email or password." };
  }

  // Route by role: a platform admin belongs in /superadmin, a restaurant
  // admin_users row belongs in /admin. Check platform first since that's the
  // rarer, higher-privilege account and shouldn't ever land on the
  // restaurant dashboard.
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (platformAdmin) redirect("/superadmin/restaurants");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminUser) redirect("/admin/menu");

  // Authenticated but linked to neither table — sign them back out so they
  // aren't left in a half-authenticated state, and surface a clear error
  // instead of silently bouncing between pages.
  await supabase.auth.signOut();
  return {
    error:
      "Your account isn't linked to a restaurant or the platform yet. Contact an administrator.",
  };
}

export type ForgotPasswordState =
  | { error: string; success?: undefined }
  | { success: true; error?: undefined }
  | undefined;

export async function forgotPassword(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  // Build the redirect origin from the incoming request so the link works on
  // localhost and in production alike; fall back to the configured site URL.
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL!;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/admin/reset-password`,
  });

  // Supabase intentionally doesn't reveal whether the email exists; the only
  // real failures here are rate limits / config errors, which we do surface.
  if (error) {
    return { error: "Could not send the reset email. Try again in a minute." };
  }

  return { success: true };
}

export type ResetPasswordState =
  | { error: string }
  | { error: null }
  | undefined;

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Your reset link has expired or is invalid. Request a new one from the login page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/admin/orders?password_reset=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type AcceptInviteState =
  | { error: string }
  | { error: null }
  | undefined;

// Runs after an invited owner has a valid session (established by the
// /auth/confirm route or the email link). Sets their chosen password and links
// their auth id into admin_users. The restaurant_id comes from the user
// metadata we set at invite time — never from client input — and the role is
// always 'owner' for this flow.
export async function acceptInvite(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Your invite link has expired or is invalid. Ask for a new invitation.",
    };
  }

  const restaurantId = user.user_metadata?.restaurant_id as string | undefined;
  const name =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Owner";

  if (!restaurantId) {
    // The active session isn't an invitee (no invite metadata). This almost
    // always means someone was already logged in when they opened the invite,
    // so we ended up acting as that account. If they're already a linked admin,
    // just send them in; otherwise tell them to reopen the invite cleanly.
    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingAdmin) redirect("/admin/menu");

    return {
      error:
        `You're signed in as ${user.email ?? "another account"}, which isn't the invited user. ` +
        "Sign out (or open the invite link in a private window) and try again.",
    };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return { error: passwordError.message };
  }

  // Perform the linkage with the service-role client. We've already verified
  // this is the invited user via getUser(), and restaurant_id/role come from
  // trusted invite metadata (not client input) — so this is a legitimate
  // privileged write. Using the admin client sidesteps the RLS insert policy,
  // which depends on the user's JWT being carried on the write and can fail
  // right after a session/password change. Idempotent via onConflict so a
  // refresh or double-submit is harmless.
  const admin = createAdminClient();
  const { error: linkError } = await admin.from("admin_users").upsert(
    {
      id: user.id,
      restaurant_id: restaurantId,
      name,
      role: "owner",
    },
    { onConflict: "id" },
  );

  if (linkError) {
    return { error: linkError.message };
  }

  redirect("/admin/menu");
}

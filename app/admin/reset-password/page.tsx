import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

// Reached via the recovery email link: /auth/confirm exchanges the token for
// a session cookie, then forwards here. The proxy already guards this path,
// but we re-verify server-side so a stale/expired exchange can't render the
// form.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <ResetPasswordForm email={user.email ?? null} />
    </main>
  );
}

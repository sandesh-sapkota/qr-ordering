"use client";

import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite, type AcceptInviteState } from "@/app/actions/auth";

type SessionStatus = "checking" | "ready" | "missing" | "wrongUser";

export default function AcceptInviteClient() {
  const [status, setStatus] = useState<SessionStatus>("checking");
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [wrongEmail, setWrongEmail] = useState<string | null>(null);
  const [state, action, pending] = useActionState<AcceptInviteState, FormData>(
    acceptInvite,
    undefined,
  );

  // Establish the session before showing the form. Two ways the invite can
  // arrive:
  //   1. Tokens in the URL fragment (default invite email → implicit flow). We
  //      parse them and call setSession explicitly rather than relying on the
  //      browser client's auto-detection, which is unreliable for hash tokens.
  //      This is deterministic and overrides any account already logged in.
  //   2. Cookies already set by the /auth/confirm route (token-hash template).
  // We only proceed for a session that actually belongs to an invitee (has
  // invite metadata); any other account is surfaced as the wrong user.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function handleSession(
      session: import("@supabase/supabase-js").Session | null,
    ) {
      if (cancelled) return;
      if (!session) {
        setStatus("missing");
        return;
      }

      const meta = session.user.user_metadata ?? {};
      if (!meta.restaurant_id) {
        // A session exists, but it's not the invited owner.
        setWrongEmail(session.user.email ?? null);
        setStatus("wrongUser");
        return;
      }

      setOwnerName((meta.name as string | undefined) ?? null);
      setStatus("ready");
    }

    async function init() {
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(rawHash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const errorDescription = hashParams.get("error_description");

      if (errorDescription) {
        if (!cancelled) setStatus("missing");
        return;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Strip the tokens from the URL so they don't linger in history.
        window.history.replaceState(null, "", window.location.pathname);
        handleSession(error ? null : data.session);
        return;
      }

      const { data } = await supabase.auth.getSession();
      handleSession(data.session);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOutAndReload() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Reload so detectSessionInUrl can process the invite link fragment fresh.
    window.location.reload();
  }

  if (status === "checking") {
    return (
      <div className="w-full max-w-sm text-center text-sm text-zinc-500">
        Verifying your invitation…
      </div>
    );
  }

  if (status === "wrongUser") {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900">
            You&apos;re signed in as someone else
          </h1>
          <p className="text-sm text-zinc-500">
            {wrongEmail ? (
              <>
                This browser is logged in as{" "}
                <span className="font-medium text-zinc-700">{wrongEmail}</span>,
                which isn&apos;t the invited account.
              </>
            ) : (
              "This browser is already logged in with a different account."
            )}{" "}
            Sign out to continue accepting the invite.
          </p>
        </div>
        <button
          type="button"
          onClick={signOutAndReload}
          className="flex w-full items-center justify-center rounded-lg bg-brand-accent px-4 py-2.5 text-base font-medium text-zinc-950 transition-[filter] hover:brightness-110"
        >
          Sign out & continue
        </button>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          Invitation invalid or expired
        </h1>
        <p className="text-sm text-zinc-500">
          This link is no longer valid. Ask the platform admin to send a new
          invitation.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Set your password
        </h1>
        <p className="text-sm text-zinc-500">
          {ownerName ? `Welcome, ${ownerName}. ` : ""}
          Choose a password to finish setting up your account.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-zinc-700"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
            placeholder="Re-enter password"
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
          className="flex w-full items-center justify-center rounded-lg bg-brand-accent px-4 py-2.5 text-base font-medium text-zinc-950 transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Set password & continue"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteAdmin, type InviteAdminState } from "@/app/actions/superadmin";

export default function InviteAdminClient({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [state, action, pending] = useActionState<InviteAdminState, FormData>(
    inviteAdmin,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful invite so the next one starts blank.
  useEffect(() => {
    if (state && state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-zinc-700">Invite Admin</h2>
      <p className="mb-3 text-xs text-zinc-400">
        Emails the owner a link to set a password. They&apos;ll be linked to this
        restaurant as <span className="font-medium text-zinc-500">owner</span>.
      </p>

      <form ref={formRef} action={action} className="space-y-4">
        <input type="hidden" name="restaurantId" value={restaurantId} />

        <div className="space-y-1">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700"
          >
            Owner name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
            placeholder="Sita Sharma"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700"
          >
            Owner email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
            placeholder="owner@example.com"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        {state?.error === null && state.success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Sending invite…" : "Send invite"}
        </button>
      </form>
    </div>
  );
}

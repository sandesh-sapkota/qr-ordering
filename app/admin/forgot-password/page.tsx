"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  forgotPassword,
  type ForgotPasswordState,
} from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(forgotPassword, undefined);

  if (state?.success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Check your inbox
          </h1>
          <p className="text-sm text-zinc-500">
            If an account exists for that email, we&apos;ve sent a link to
            reset your password. The link expires after a short while, so use
            it soon.
          </p>
          <Link
            href="/admin/login"
            className="inline-block text-sm font-medium text-zinc-700 underline underline-offset-4 transition hover:text-zinc-900"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Forgot password
          </h1>
          <p className="text-sm text-zinc-500">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
              placeholder="you@example.com"
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
            className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Remembered it?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-zinc-700 underline underline-offset-4 transition hover:text-zinc-900"
          >
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}

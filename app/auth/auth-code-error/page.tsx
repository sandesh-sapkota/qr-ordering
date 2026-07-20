export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          Couldn&apos;t verify your link
        </h1>
        <p className="text-sm text-zinc-500">
          The invitation link is invalid or has expired. Ask the platform admin
          to send a new invitation.
        </p>
      </div>
    </main>
  );
}

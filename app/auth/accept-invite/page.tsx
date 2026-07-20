import AcceptInviteClient from "./AcceptInviteClient";

// Lives outside /admin on purpose: the proxy guards /admin and would bounce a
// not-yet-linked invitee to the login screen (and drop the URL fragment in the
// implicit-flow case) before their session is established. Session detection
// and password setup happen client-side here, then acceptInvite links them.
export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <AcceptInviteClient />
    </main>
  );
}

import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data, error } = await supabase.from("test").select("id, message");

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">Test</h1>
        <p className="text-red-600">Error: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Test</h1>
      {data?.length ? (
        <ul className="space-y-2">
          {data.map((row) => (
            <li key={row.id} className="rounded-lg border px-4 py-2">
              <span className="text-zinc-500">#{row.id}</span> — {row.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500">No rows found.</p>
      )}
    </main>
  );
}

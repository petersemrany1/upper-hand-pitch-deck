// Ported from the Legal app (family-law-floater/src/components/dashboard/ShowsRemaining.tsx). Re-run the port script to refresh.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/legal/integrations/supabase/client";
import { dashboardShows } from "@/legal/lib/dashboard-shows";

// Read every page: a truncated appointment history would overstate what we owe.
async function allRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
async function fetchShows() {
  const [firms, packs, appointments] = await Promise.all([
    allRows((from, to) =>
      supabase
        .from("firms")
        .select("id, firm_name, is_active")
        .eq("is_active", true)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("firm_packs")
        .select("firm_id, pack_size, status")
        .in("status", ["active", "completed"])
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("firm_appointments")
        .select("firm_id, client_name, status, outcome, disqualified_at")
        .order("id")
        .range(from, to),
    ),
  ]);
  return dashboardShows(firms, packs, appointments);
}

export function ShowsRemaining() {
  const query = useQuery({
    queryKey: ["dashboard-shows"],
    queryFn: fetchShows,
    refetchInterval: 60_000,
  });
  return (
    <section
      className="mt-8 rounded-2xl border border-primary/30 bg-card p-6 md:p-8"
      aria-labelledby="shows-heading"
    >
      <h2 id="shows-heading" className="text-xl font-extrabold tracking-tight">
        Shows remaining
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Shows still owed across active partner firms.
      </p>
      {query.isPending ? (
        <p className="mt-5 text-muted-foreground" role="status">
          Loading show balances…
        </p>
      ) : query.isError ? (
        <div className="mt-5" role="alert">
          <p>Could not load show balances.</p>
          <button
            type="button"
            className="mt-2 text-primary underline"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        query.data && (
          <>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                ["Spots still to book", query.data.toBook],
                ["Already booked · awaiting outcome", query.data.booked],
                ["Total shows remaining", query.data.remaining],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-mono text-5xl font-extrabold tabular-nums text-primary">
                    {Number(value).toLocaleString("en-AU")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {query.data.rows.length ? (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-3 font-medium">Firm</th>
                      <th className="px-3 py-3 text-right font-medium">Still to book</th>
                      <th className="px-3 py-3 text-right font-medium">Booked</th>
                      <th className="py-3 text-right font-medium">Shows remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.rows.map((firm) => (
                      <tr key={firm.id} className="border-b border-border/50 last:border-0">
                        <th scope="row" className="py-3 font-medium">
                          {firm.name}
                        </th>
                        <td className="px-3 py-3 text-right font-bold tabular-nums text-primary">
                          {firm.toBook}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{firm.booked}</td>
                        <td className="py-3 text-right tabular-nums">{firm.remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                No purchased shows remain to be delivered.
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Based on purchased packs, less attended shows. Cancellations, no-shows and
              disqualified appointments do not use a show. Demo and test records are excluded.
              Includes shows on hold; check firm availability before booking.
            </p>
          </>
        )
      )}
    </section>
  );
}

// Ported from the Legal app (family-law-floater/src/components/firm-portal/StaffFirmPortal.tsx). Re-run the port script to refresh.
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/legal/runtime/router";
import { useState } from "react";
import { supabase } from "@/legal/integrations/supabase/client";
import { fetchFirms, fetchLawyers, fetchTradingHours, DAY_NAMES } from "@/legal/lib/partner-firms";
import { landingPathFor, type PortalRole } from "@/legal/lib/roles";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";

/** View access does not grant the administrative actions used to manage partner accounts. */
export function StaffFirmPortal({ role }: { role: PortalRole }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const firms = useQuery({ queryKey: ["staff-portal-firms"], queryFn: fetchFirms });
  const detail = useQuery({
    queryKey: ["staff-portal-detail", selected],
    enabled: !!selected,
    queryFn: async () => {
      const [lawyers, hours, appointments] = await Promise.all([
        fetchLawyers(selected!),
        fetchTradingHours(selected!),
        supabase
          .from("firm_appointments")
          .select("id, client_name, appointment_date, appointment_time, status")
          .eq("firm_id", selected!)
          .order("appointment_date", { ascending: false })
          .limit(100),
      ]);
      if (appointments.error) throw new Error(appointments.error.message);
      return { lawyers, hours, appointments: appointments.data };
    },
  });
  const firm = firms.data?.find((f) => f.id === selected);
  const home = landingPathFor(role);
  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Firm portal</h1>
          <p className="text-sm text-muted-foreground">
            View partner firms, availability and appointments. Account management is admin-only.
          </p>
        </div>
        <div className="flex gap-2">
          {home && home !== "/firm-portal" && (
            <Button variant="outline" asChild>
              <Link to={home}>Back to workspace</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <Input
        aria-label="Search partner firms"
        placeholder="Search partner firms…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {firms.isPending && <p role="status">Loading firms…</p>}
      {firms.error && <p role="alert">{firms.error.message}</p>}
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {(firms.data ?? [])
            .filter((f) =>
              [f.firm_name, f.city].join(" ").toLowerCase().includes(search.toLowerCase()),
            )
            .map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                aria-pressed={selected === f.id}
                className={`block w-full rounded-lg border p-3 text-left ${selected === f.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <span className="block font-medium">{f.firm_name}</span>
                <span className="text-sm text-muted-foreground">{f.city}</span>
              </button>
            ))}
        </div>
        <section className="space-y-5 rounded-xl border p-5">
          {!firm ? (
            <p className="text-muted-foreground">Select a firm to view its portal.</p>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold">{firm.firm_name}</h2>
                <p className="text-sm text-muted-foreground">{firm.address}</p>
                <p className="text-sm">
                  {firm.email} {firm.phone}
                </p>
              </div>
              {detail.isPending && <p role="status">Loading portal…</p>}
              {detail.error && <p role="alert">{detail.error.message}</p>}
              {detail.data && (
                <>
                  <div>
                    <h3 className="mb-2 font-semibold">Lawyers</h3>
                    {detail.data.lawyers.map((l) => (
                      <p key={l.id} className="text-sm">
                        {l.name}
                        {l.title ? ` — ${l.title}` : ""}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">Availability</h3>
                    {detail.data.hours.map((h) => (
                      <p key={h.id} className="text-sm">
                        {DAY_NAMES[h.day_of_week]}:{" "}
                        {h.is_open
                          ? `${h.open_time?.slice(0, 5)}–${h.close_time?.slice(0, 5)}`
                          : "Closed"}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">Recent appointments</h3>
                    {detail.data.appointments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No appointments available for your account.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {detail.data.appointments.map((a) => (
                          <div
                            key={a.id}
                            className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                          >
                            <span>{a.client_name || "Client"}</span>
                            <span>
                              {a.appointment_date} {a.appointment_time} · {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

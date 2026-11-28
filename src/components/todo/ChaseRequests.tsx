import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ChaseQueuePanel } from "@/components/ChaseQueuePanel";
import { BusinessChip } from "@/components/business/BusinessSwitch";
import { RequireLegal } from "@/components/business/LegalConnect";
import { legalAppLink, legalDb } from "@/lib/legal/client";
import { BUSINESS_COLOR } from "@/lib/business";
import { C } from "./bits";

function fmtDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

/** Clinic and firm chase requests, shown as the "Chase requests" smart list. */
export function ChaseRequests({
  filter,
  onClinicCount,
  onFirmCount,
}: {
  filter: "all" | "hair" | "legal";
  onClinicCount: (n: number) => void;
  onFirmCount: (n: number) => void;
}) {
  return (
    <div className="space-y-8">
      {filter !== "legal" && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: C.text }}>
            Clinic chase requests <BusinessChip business="hair" />
          </h2>
          <ChaseQueuePanel onCount={onClinicCount} />
        </section>
      )}
      {filter !== "hair" && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: C.text }}>
            Firm chase requests <BusinessChip business="legal" />
          </h2>
          <RequireLegal compact>
            <LegalChaseList onCount={onFirmCount} />
          </RequireLegal>
        </section>
      )}
    </div>
  );
}

type LegalChase = {
  id: string;
  client_name: string | null;
  appointment_date: string | null;
  chase_note: string | null;
  chase_requested_at: string | null;
  firms: { firm_name: string | null } | null;
};

function LegalChaseList({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<LegalChase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    legalDb()
      .from("firm_appointments")
      .select("id, client_name, appointment_date, chase_note, chase_requested_at, firms(firm_name)")
      .eq("chase_status", "requested")
      .order("chase_requested_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else {
          const list = (data ?? []) as unknown as LegalChase[];
          setRows(list);
          onCount(list.length);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (error) return <p className="text-sm" style={{ color: "#b83232" }}>{error}</p>;
  if (!rows) return <p className="text-sm" style={{ color: C.muted }}>Loading…</p>;
  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center text-sm" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
        No firm chase requests right now.
      </div>
    );
  }
  const link = legalAppLink("/booked-appointments");
  return (
    <ul className="overflow-hidden rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: `1px solid ${C.soft}` }}>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" style={{ color: C.text }}>
              {r.client_name ?? "Client"} <span style={{ color: "#8a8a86" }}>· {r.firms?.firm_name ?? "Firm"}</span>
            </div>
            {r.chase_note && <div className="truncate text-xs" style={{ color: C.muted }}>{r.chase_note}</div>}
          </div>
          {r.appointment_date && <span className="text-xs" style={{ color: C.muted }}>{fmtDay(r.appointment_date)}</span>}
          <a
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: BUSINESS_COLOR.legal.fg }}
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}

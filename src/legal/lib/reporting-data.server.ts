// Ported from the Legal app (family-law-floater/src/lib/reporting-data.server.ts). Re-run the port script to refresh.
import { collectPages } from "./collect-pages";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import type { Database } from "@/legal/integrations/supabase/types";
import { TEST_FIRM_ID } from "./firm-portal-credits";

type Table = keyof Database["public"]["Tables"];
export type Row<T extends Table> = Database["public"]["Tables"][T]["Row"];
export type ReportingData = {
  leads: Row<"client_leads">[];
  appointments: (Row<"firm_appointments"> & { booking_rep_id?: string | null })[];
  calls: Row<"call_records">[];
  firms: Row<"firms">[];
  packs: Row<"firm_packs">[];
  reps: Row<"sales_reps">[];
  sessions: Row<"rep_sessions">[];
};
// Stable ordering, every page, and a hard error on any failed page. Never turn
// an incomplete result into an apparently valid total.
export async function readAll<T extends Table>(table: T, columns = "*"): Promise<Row<T>[]> {
  return (await collectPages((from, to) => {
    const query = supabaseAdmin.from(table).select(columns);
    // Corrections have a composite primary key and no synthetic id column.
    const ordered =
      table === "reporting_hour_overrides"
        ? query.order("rep_id").order("work_date")
        : query.order("id");
    return ordered.range(from, to);
  })) as unknown as Row<T>[];
}
export async function loadReportingData(
  options: { includeInbound?: boolean } = {},
): Promise<ReportingData> {
  const [leads, appointments, calls, firms, packs, reps, sessions] = await Promise.all([
    readAll(
      "client_leads",
      "id,created_at,first_name,last_name,city,firm_id,rep_id,deposit_paid_at,phone,ad_name,campaign_name,status,raw_payload",
    ),
    readAll(
      "firm_appointments",
      "id,lead_id,firm_id,client_name,client_phone,created_at,appointment_date,appointment_time,status,outcome,disqualified_at,booking_rep_id,offer_pack_id",
    ),
    readAll(
      "call_records",
      "id,lead_id,rep_id,duration_seconds,call_status,direction,created_at,twilio_call_sid",
    ),
    readAll("firms", "id,firm_name,city,is_active"),
    readAll("firm_packs", "id,firm_id,status,pack_size,price_per_show,price_per_show_cents"),
    readAll("sales_reps", "id,name,role,is_active"),
    readAll("rep_sessions", "id,rep_id,started_at,ended_at"),
  ]);
  const examples = new Set(
    leads
      .filter(
        (l) =>
          /\b(test|demo)\b/i.test(`${l.first_name ?? ""} ${l.last_name ?? ""}`) ||
          l.firm_id === TEST_FIRM_ID,
      )
      .map((l) => l.id),
  );
  return {
    leads: leads.filter((l) => !examples.has(l.id)),
    appointments: appointments.filter(
      (a) =>
        a.firm_id !== TEST_FIRM_ID &&
        !examples.has(a.lead_id ?? "") &&
        !/\b(test|demo)\b/i.test(a.client_name ?? ""),
    ),
    // Dashboard conversion is outbound; Numbers also costs actual inbound client calls.
    // Prospecting and system calls remain excluded.
    calls: calls.filter(
      (c) =>
        !!c.lead_id &&
        !examples.has(c.lead_id) &&
        ((c.direction ?? "outbound") === "outbound" ||
          (options.includeInbound && c.direction === "inbound")),
    ),
    firms: firms.filter((f) => f.id !== TEST_FIRM_ID),
    packs: packs.filter((p) => p.firm_id !== TEST_FIRM_ID),
    reps,
    sessions,
  };
}

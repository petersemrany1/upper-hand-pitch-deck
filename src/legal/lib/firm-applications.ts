// Ported from the Legal app (family-law-floater/src/lib/firm-applications.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import { collectPages } from "./collect-pages";

export const STAGES = [
  { value: "new", label: "New" },
  { value: "no_answer", label: "No answer" },
  { value: "follow_up", label: "Follow ups" },
  { value: "calendly_booked", label: "Calendly booked" },
  { value: "zoom_booked", label: "Zoom booked" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "signed", label: "Signed" },
  { value: "dead", label: "Dead" },
] as const;

export type StageValue = (typeof STAGES)[number]["value"];

export type FirmApplication = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  firm_name: string | null;
  city: string | null;
  stage: string;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
  lead_id: string | null;
  created_at: string;
  calendly_event_uri?: string | null;
  calendly_start_at?: string | null;
  calendly_end_at?: string | null;
};

export type NoteKind = "user" | "system";

export type FirmNote = {
  id: string;
  application_id: string;
  body: string;
  kind: NoteKind;
  created_at: string;
};

export function displayName(app: FirmApplication): string {
  const person = [app.first_name, app.last_name].filter(Boolean).join(" ").trim();
  return app.firm_name?.trim() || person || app.email || "Unnamed application";
}

export function personName(app: FirmApplication): string {
  return [app.first_name, app.last_name].filter(Boolean).join(" ").trim() || "—";
}

export function stageLabel(stage: string): string {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "just now", "12m ago", "2h ago", "3d ago", "5w ago" */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function daysWaiting(iso: string, now: number = Date.now()): number {
  return Math.floor(Math.max(0, now - new Date(iso).getTime()) / 86_400_000);
}

export async function fetchApplications(): Promise<FirmApplication[]> {
  return collectPages((from, to) =>
    supabase
      .from("firm_applications")
      .select(
        "id, first_name, last_name, email, phone, firm_name, city, stage, ad_name, adset_name, campaign_name, lead_id, created_at, calendly_event_uri, calendly_start_at, calendly_end_at",
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
}

export async function fetchNotes(applicationId: string): Promise<FirmNote[]> {
  return collectPages((from, to) =>
    supabase
      .from("firm_application_notes")
      .select("id, application_id, body, kind, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  ) as Promise<FirmNote[]>;
}

export type FirmDuplicateHistory = {
  notes: FirmNote[];
  sheets: {
    application_id: string;
    answers: Record<string, string>;
    updated_at: string;
  }[];
};

/** Reads under the signed-in user's existing RLS permissions; never copies notes. */
export async function fetchFirmDuplicateHistory(
  applicationIds: string[],
  includeCallSheets = true,
): Promise<FirmDuplicateHistory> {
  const ids = [...new Set(applicationIds)].sort();
  const history: FirmDuplicateHistory = { notes: [], sheets: [] };
  // Bound URL size for unusually large groups sharing a firm contact address.
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const [notes, sheets] = await Promise.all([
      collectPages((from, to) =>
        supabase
          .from("firm_application_notes")
          .select("id, application_id, body, kind, created_at")
          .in("application_id", batch)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      includeCallSheets
        ? collectPages((from, to) =>
            supabase
              .from("firm_application_call_sheets")
              .select("application_id, answers, updated_at")
              .in("application_id", batch)
              .order("application_id")
              .range(from, to),
          )
        : Promise.resolve([]),
    ]);
    history.notes.push(...(notes as FirmNote[]));
    history.sheets.push(
      ...sheets.map((sheet) => ({
        ...sheet,
        answers: Object.fromEntries(
          Object.entries(sheet.answers ?? {}).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      })),
    );
  }
  return history;
}

export type NoteSummary = { count: number; latest: string | null };

/** Per-application user-note count plus a preview of the newest user note. */
export async function fetchNoteSummaries(): Promise<Record<string, NoteSummary>> {
  const { data, error } = await supabase
    .from("firm_application_notes")
    .select("application_id, body, kind, created_at")
    .eq("kind", "user")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, NoteSummary> = {};
  for (const row of (data ?? []) as { application_id: string; body: string }[]) {
    const entry = map[row.application_id];
    if (entry) entry.count += 1;
    else map[row.application_id] = { count: 1, latest: row.body };
  }
  return map;
}

export async function updateStage(id: string, stage: StageValue): Promise<void> {
  const { error } = await supabase.from("firm_applications").update({ stage }).eq("id", id);
  if (error) throw error;
}

export async function addNote(
  applicationId: string,
  body: string,
  kind: NoteKind = "user",
): Promise<void> {
  const { error } = await supabase
    .from("firm_application_notes")
    .insert({ application_id: applicationId, body, kind });
  if (error) throw error;
}

/** Move a firm and record a system activity entry. */
export async function moveStage(id: string, stage: StageValue): Promise<void> {
  await updateStage(id, stage);
  try {
    await addNote(id, `Moved to ${stageLabel(stage)}`, "system");
  } catch {
    // activity logging must never block the move
  }
}

import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Printer, Download, Mail, Check, X, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";

export const Route = createLazyFileRoute("/_dashboard/letter-campaign")({
  component: LetterCampaignPage,
});

const ELIGIBLE_STATUSES = [
  "Not Started",
  "Contacted — No Answer",
  "Contacted — Gatekeeper",
  "Contacted — Call Me Back",
] as const;

const STATES_ABBR: Record<string, string> = {
  "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD",
  "Western Australia": "WA", "South Australia": "SA", "Tasmania": "TAS",
  "ACT": "ACT", "Northern Territory": "NT",
};

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

type Clinic = {
  id: string;
  clinic_name: string;
  state: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  owner_name: string | null;
  doctor_name: string | null;
  address: string | null;
  priority: string | null;
  status: string;
  notes: string | null;
  next_follow_up: string | null;
  is_parent: boolean | null;
  parent_clinic_id: string | null;
  letter_sent: boolean;
  letter_sent_at: string | null;
};

type LastCall = {
  called_at: string;
  outcome: string | null;
  status: string | null;
  duration_seconds: number | null;
};

function addresseeFor(c: Clinic): string {
  return c.doctor_name?.trim() || c.owner_name?.trim() || "The principal surgeon / practice owner";
}

function formatSentDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}



function LetterCampaignPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [coversCounts, setCoversCounts] = useState<Record<string, number>>({});
  const [lastCalls, setLastCalls] = useState<Record<string, LastCall>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notesEditingId, setNotesEditingId] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinics")
      .select("id, clinic_name, state, city, phone, email, owner_name, doctor_name, address, priority, status, notes, next_follow_up, is_parent, parent_clinic_id, letter_sent, letter_sent_at")
      .in("status", ELIGIBLE_STATUSES as unknown as string[])
      .or("is_parent.eq.true,parent_clinic_id.is.null")
      .eq("letter_campaign_excluded", false)
      .limit(2000);
    if (error) {
      toast.error("Failed to load clinics");
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Clinic[];
    setClinics(rows);

    const { data: childRows } = await supabase
      .from("clinics")
      .select("parent_clinic_id")
      .not("parent_clinic_id", "is", null)
      .limit(5000);
    const counts: Record<string, number> = {};
    (childRows ?? []).forEach((r: { parent_clinic_id: string | null }) => {
      if (r.parent_clinic_id) counts[r.parent_clinic_id] = (counts[r.parent_clinic_id] ?? 0) + 1;
    });
    setCoversCounts(counts);

    // Latest call per clinic (most-recent first; keep first seen per clinic_id)
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const { data: callRows } = await supabase
        .from("call_records")
        .select("clinic_id, called_at, outcome, status, duration_seconds")
        .in("clinic_id", ids)
        .order("called_at", { ascending: false })
        .limit(5000);
      const map: Record<string, LastCall> = {};
      (callRows ?? []).forEach((r: { clinic_id: string | null; called_at: string; outcome: string | null; status: string | null; duration_seconds: number | null }) => {
        if (r.clinic_id && !map[r.clinic_id]) {
          map[r.clinic_id] = { called_at: r.called_at, outcome: r.outcome, status: r.status, duration_seconds: r.duration_seconds };
        }
      });
      setLastCalls(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clinics.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q) {
        const hay = `${c.clinic_name} ${c.city ?? ""} ${c.state ?? ""} ${c.address ?? ""} ${c.doctor_name ?? ""} ${c.owner_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clinics, search, statusFilter]);

  const grouped = useMemo(() => {
    const byPrio = new Map<string, Clinic[]>();
    for (const c of filtered) {
      const key = c.priority || "Unspecified";
      if (!byPrio.has(key)) byPrio.set(key, []);
      byPrio.get(key)!.push(c);
    }
    for (const arr of byPrio.values()) {
      arr.sort((a, b) => (a.state ?? "").localeCompare(b.state ?? "") || a.clinic_name.localeCompare(b.clinic_name));
    }
    return Array.from(byPrio.entries()).sort(
      ([a], [b]) => (PRIORITY_ORDER[a] ?? 99) - (PRIORITY_ORDER[b] ?? 99),
    );
  }, [filtered]);

  const totals = useMemo(() => {
    const total = clinics.length;
    const sent = clinics.filter((c) => c.letter_sent).length;
    const ready = clinics.filter((c) => !c.letter_sent && !!c.address).length;
    const needs = clinics.filter((c) => !c.letter_sent && !c.address).length;
    return { total, sent, ready, needs, toSend: total - sent };
  }, [clinics]);

  const toggleSent = async (c: Clinic, next: boolean) => {
    const sent_at = next ? new Date().toISOString() : null;
    setClinics((prev) => prev.map((x) => (x.id === c.id ? { ...x, letter_sent: next, letter_sent_at: sent_at } : x)));
    const { error } = await supabase
      .from("clinics")
      .update({ letter_sent: next, letter_sent_at: sent_at })
      .eq("id", c.id);
    if (error) {
      toast.error("Could not update");
      setClinics((prev) => prev.map((x) => (x.id === c.id ? { ...x, letter_sent: c.letter_sent, letter_sent_at: c.letter_sent_at } : x)));
    }
  };

  const saveFields = async (id: string, patch: { doctor_name?: string | null; address?: string | null; notes?: string | null }) => {
    setClinics((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("clinics").update(patch).eq("id", id);
    if (error) toast.error("Could not save");
  };

  const removeFromCampaign = async (c: Clinic) => {
    setClinics((prev) => prev.filter((x) => x.id !== c.id));
    const { error } = await supabase.from("clinics").update({ letter_campaign_excluded: true }).eq("id", c.id);
    if (error) {
      toast.error("Could not remove");
      setClinics((prev) => [...prev, c]);
      return;
    }
    toast(`Removed "${c.clinic_name}" from this campaign`, {
      action: {
        label: "Undo",
        onClick: async () => {
          const { error: undoErr } = await supabase.from("clinics").update({ letter_campaign_excluded: false }).eq("id", c.id);
          if (undoErr) { toast.error("Could not undo"); return; }
          setClinics((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c]);
        },
      },
      duration: 6000,
    });
  };

  const printSheet = () => window.print();

  const downloadCsv = () => {
    const headers = ["Addressee", "Clinic", "Address", "State", "Phone", "Covers", "Status", "LetterSent"];
    const rows = filtered.map((c) => [
      addresseeFor(c),
      c.clinic_name,
      c.address ?? "",
      c.state ?? "",
      c.phone ?? "",
      coversCounts[c.id] ?? 0,
      c.status,
      c.letter_sent ? formatSentDate(c.letter_sent_at) || "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `letter-campaign-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 max-w-5xl mx-auto letter-campaign">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .letter-campaign, .letter-campaign * { visibility: visible; }
          .letter-campaign { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .print-row { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 12px; page-break-inside: avoid; }
        }
        .print-row { display: none; }
      `}</style>

      <div className="no-print">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Letter Campaign</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Post every letter marked Private &amp; Confidential — it bypasses the front desk.
        </p>

        {showHowItWorks && (
          <div className="relative bg-muted/40 border rounded-md px-4 py-2.5 mb-4 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className="absolute top-1.5 right-2 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
            <span><span className="font-semibold text-foreground">1.</span> Find the address</span>
            <span><span className="font-semibold text-foreground">2.</span> Print the ready list</span>
            <span><span className="font-semibold text-foreground">3.</span> Handwrite &amp; post the letter (mark the envelope <em>Private &amp; Confidential</em>)</span>
            <span><span className="font-semibold text-foreground">4.</span> Tick the box once it's posted</span>
          </div>
        )}

        {/* Summary strip */}
        <div className="bg-muted/50 border rounded-md px-4 py-2.5 mb-4 text-sm flex flex-wrap items-center gap-x-1 gap-y-1">
          <span><strong>{totals.toSend}</strong> <span className="text-muted-foreground">to send</span></span>
          <span className="text-muted-foreground/50 mx-2">·</span>
          <span><strong>{totals.ready}</strong> <span className="text-muted-foreground">ready to print</span></span>
          <span className="text-muted-foreground/50 mx-2">·</span>
          <span className="text-amber-600"><strong>{totals.needs}</strong> need an address</span>
          <span className="text-muted-foreground/50 mx-2">·</span>
          <span><strong>{totals.sent}</strong> <span className="text-muted-foreground">sent</span></span>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ELIGIBLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={printSheet} className="h-9">
            <Printer className="h-3.5 w-3.5 mr-1" />Print
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} className="h-9">
            <Download className="h-3.5 w-3.5 mr-1" />CSV
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center border rounded-md">No clinics match these filters.</div>
        ) : (
          <KanbanBoard
            clinics={filtered}
            coversCounts={coversCounts}
            lastCalls={lastCalls}
            editingId={editingId}
            onStartEdit={setEditingId}
            onStopEdit={() => setEditingId(null)}
            notesEditingId={notesEditingId}
            onStartNotesEdit={setNotesEditingId}
            onStopNotesEdit={() => setNotesEditingId(null)}
            onToggleSent={toggleSent}
            onSave={saveFields}
            onRemove={removeFromCampaign}
          />
        )}
      </div>

      {/* Print-only compact list */}
      <div className="hidden print:block">
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Letter Campaign — {new Date().toLocaleDateString("en-AU")}</h1>
        {filtered.map((c) => (
          <div key={c.id} className="print-row">
            <div style={{ width: 220 }}><strong>{addresseeFor(c)}</strong></div>
            <div style={{ width: 220 }}>{c.clinic_name}</div>
            <div style={{ flex: 1 }}>{c.address ?? "—"}</div>
            <div style={{ width: 50 }}>{STATES_ABBR[c.state ?? ""] ?? c.state ?? ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LetterRow({
  clinic, covers, lastCall, editing, onStartEdit, onStopEdit,
  notesEditing, onStartNotesEdit, onStopNotesEdit,
  onToggleSent, onSave,
}: {
  clinic: Clinic;
  covers: number;
  lastCall: LastCall | null;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  notesEditing: boolean;
  onStartNotesEdit: () => void;
  onStopNotesEdit: () => void;
  onToggleSent: (v: boolean) => void;
  onSave: (patch: { doctor_name?: string | null; address?: string | null; notes?: string | null }) => void;
}) {
  const sent = clinic.letter_sent;
  const addressee = addresseeFor(clinic);
  const stateShort = clinic.state ? (STATES_ABBR[clinic.state] ?? clinic.state) : null;

  const [draftAddressee, setDraftAddressee] = useState(clinic.doctor_name ?? "");
  const [draftAddress, setDraftAddress] = useState(clinic.address ?? "");

  useEffect(() => {
    if (editing) {
      setDraftAddressee(clinic.doctor_name ?? "");
      setDraftAddress(clinic.address ?? "");
    }
  }, [editing, clinic.doctor_name, clinic.address]);

  const save = () => {
    onSave({
      doctor_name: draftAddressee.trim() === "" ? null : draftAddressee.trim(),
      address: draftAddress.trim() === "" ? null : draftAddress.trim(),
    });
    onStopEdit();
  };

  if (editing) {
    return (
      <div className="px-3 py-2.5 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground w-20">Addressee</span>
          <Input value={draftAddressee} onChange={(e) => setDraftAddressee(e.target.value)} placeholder={addressee} className="h-8 text-sm" autoFocus />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground w-20">Address</span>
          <Input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} placeholder="Street, suburb, state, postcode" className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onStopEdit(); }} />
          {!clinic.address && (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${clinic.clinic_name} ${clinic.state ?? ""}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              Find on Google ↗
            </a>
          )}
        </div>
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={onStopEdit} className="h-7"><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          <Button size="sm" onClick={save} className="h-7"><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
        </div>
      </div>
    );
  }

  const hasAddress = !!clinic.address;

  const statusTone = statusToneFor(clinic.status);
  const noteSnippet = (clinic.notes ?? "").trim().replace(/\s+/g, " ").slice(0, 140);
  const lastCallLabel = lastCall ? formatLastCall(lastCall) : null;
  const followUpLabel = clinic.next_follow_up ? formatDateShort(clinic.next_follow_up) : null;

  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors ${sent ? "opacity-50" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[role="checkbox"], button')) return;
        onStartEdit();
      }}
    >
      {/* Top line: identity */}
      <div className="flex items-center gap-3 text-sm">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={sent} onCheckedChange={(v) => onToggleSent(Boolean(v))} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`font-semibold ${sent ? "line-through" : ""}`}>{clinic.clinic_name}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className={`text-muted-foreground ${sent ? "line-through" : ""}`}>{addressee}</span>
          {covers > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 cursor-default" title={`One letter reaches ${covers} clinic${covers === 1 ? "" : "s"} in this group — you only post once.`}>covers {covers}</span>
          )}
          {stateShort && <span className="text-[11px] text-muted-foreground/70">{stateShort}</span>}
        </div>
        <div className="flex-shrink-0 text-xs">
          {sent ? (
            <span className="text-muted-foreground">sent {formatSentDate(clinic.letter_sent_at)}</span>
          ) : hasAddress ? (
            <span className="text-emerald-600">address ✓</span>
          ) : (
            <button
              type="button"
              className="text-amber-600 underline underline-offset-2 hover:text-amber-700"
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            >
              add address
            </button>
          )}
        </div>
      </div>

      {/* CRM context line */}
      <div className="ml-7 mt-1 flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px]">
        <span
          className="px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: statusTone.bg, color: statusTone.fg }}
          title="Status in the clinics CRM"
        >
          {clinic.status}
        </span>
        {lastCallLabel && (
          <span className="text-muted-foreground" title={`Last call: ${new Date(lastCall!.called_at).toLocaleString("en-AU")}`}>
            ☎ {lastCallLabel}
          </span>
        )}
        {followUpLabel && (
          <span className="text-muted-foreground">
            📅 follow-up {followUpLabel}
          </span>
        )}
        {!lastCallLabel && !followUpLabel && (
          <span className="text-muted-foreground/50">no CRM activity yet</span>
        )}
      </div>

      {/* Research notes */}
      <div className="ml-7 mt-1.5" onClick={(e) => e.stopPropagation()}>
        {notesEditing ? (
          <LetterNotesEditor
            initial={clinic.notes ?? ""}
            onCancel={onStopNotesEdit}
            onSave={(v) => {
              onSave({ notes: v.trim() === "" ? null : v });
              onStopNotesEdit();
            }}
          />
        ) : noteSnippet ? (
          <button
            type="button"
            onClick={onStartNotesEdit}
            className="text-left w-full text-[11px] text-muted-foreground/90 bg-amber-50/60 border border-amber-100 rounded px-2 py-1.5 hover:bg-amber-50 transition-colors"
            title="Click to edit research notes"
          >
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium mr-1">
              <StickyNote className="h-3 w-3" /> notes
            </span>
            <span className="whitespace-pre-wrap">{noteSnippet}{(clinic.notes ?? "").length > 140 ? "…" : ""}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartNotesEdit}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1"
          >
            <StickyNote className="h-3 w-3" /> add research notes
          </button>
        )}
      </div>
    </div>
  );
}

function LetterNotesEditor({
  initial, onSave, onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Research notes — addresses tried, who answered, links checked…"
        className="text-xs min-h-[80px]"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(value); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
      />
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to save · Esc to cancel</span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7"><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          <Button size="sm" onClick={() => onSave(value)} className="h-7"><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
        </div>
      </div>
    </div>
  );
}



const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  "Not Started": { bg: "#f3f4f6", fg: "#374151" },
  "Contacted — No Answer": { bg: "#fef3c7", fg: "#92400e" },
  "Contacted — Gatekeeper": { bg: "#fde68a", fg: "#78350f" },
  "Contacted — Call Me Back": { bg: "#dbeafe", fg: "#1e40af" },
};
function statusToneFor(s: string) {
  return STATUS_TONES[s] ?? { bg: "#f3f4f6", fg: "#374151" };
}
function formatDateShort(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" }); }
  catch { return iso; }
}
function formatLastCall(lc: LastCall): string {
  const when = formatDateShort(lc.called_at);
  const detail = lc.outcome || lc.status || "called";
  const dur = lc.duration_seconds ? ` · ${Math.round(lc.duration_seconds)}s` : "";
  return `${detail}${dur} · ${when}`;
}

type ColKey = "call" | "letter" | "research" | "sent";
const COLUMNS: { key: ColKey; title: string; hint: string }[] = [
  { key: "call", title: "Try call first", hint: "Has phone, no address" },
  { key: "letter", title: "Send letter", hint: "Address ready — print & post" },
  { key: "research", title: "Do research", hint: "Look them up" },
  { key: "sent", title: "Sent", hint: "Letter posted" },
];

function bucketFor(c: Clinic): ColKey {
  if (c.letter_sent) return "sent";
  if (c.address) return "letter";
  if (c.phone) return "call";
  return "research";
}

function KanbanBoard({
  clinics, coversCounts, lastCalls, editingId, onStartEdit, onStopEdit,
  notesEditingId, onStartNotesEdit, onStopNotesEdit, onToggleSent, onSave, onRemove,
}: {
  clinics: Clinic[];
  coversCounts: Record<string, number>;
  lastCalls: Record<string, LastCall>;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  notesEditingId: string | null;
  onStartNotesEdit: (id: string) => void;
  onStopNotesEdit: () => void;
  onToggleSent: (c: Clinic, v: boolean) => void;
  onSave: (id: string, patch: { doctor_name?: string | null; address?: string | null; notes?: string | null }) => void;
  onRemove: (c: Clinic) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);

  const byCol: Record<ColKey, Clinic[]> = { call: [], letter: [], research: [], sent: [] };
  for (const c of clinics) byCol[bucketFor(c)].push(c);
  for (const k of Object.keys(byCol) as ColKey[]) {
    byCol[k].sort((a, b) =>
      (PRIORITY_ORDER[a.priority || "Unspecified"] ?? 99) - (PRIORITY_ORDER[b.priority || "Unspecified"] ?? 99) ||
      (a.state ?? "").localeCompare(b.state ?? "") ||
      a.clinic_name.localeCompare(b.clinic_name),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        const c = (e.active.data.current as { clinic?: Clinic } | undefined)?.clinic;
        if (c) setActiveClinic(c);
      }}
      onDragCancel={() => setActiveClinic(null)}
      onDragEnd={(e) => {
        setActiveClinic(null);
        const overId = e.over?.id ? String(e.over.id) as ColKey : null;
        if (!overId) return;
        const clinic = (e.active.data.current as { clinic?: Clinic } | undefined)?.clinic;
        if (!clinic) return;
        const from = bucketFor(clinic);
        if (from === overId) return;
        if (overId === "sent") {
          onToggleSent(clinic, true);
        } else if (from === "sent") {
          onToggleSent(clinic, false);
        } else {
          toast("Moving between these columns happens automatically — add an address or phone.", { duration: 2500 });
        }
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
          <LetterColumn key={col.key} colKey={col.key} title={col.title} hint={col.hint} count={byCol[col.key].length}>
            {byCol[col.key].length === 0 ? (
              <div className="text-[11px] text-muted-foreground/60 px-3 py-4 text-center">—</div>
            ) : byCol[col.key].map((c) => (
              <DraggableLetterCard
                key={c.id}
                clinic={c}
                covers={coversCounts[c.id] ?? 0}
                lastCall={lastCalls[c.id] ?? null}
                editing={editingId === c.id}
                onStartEdit={() => onStartEdit(c.id)}
                onStopEdit={onStopEdit}
                notesEditing={notesEditingId === c.id}
                onStartNotesEdit={() => onStartNotesEdit(c.id)}
                onStopNotesEdit={onStopNotesEdit}
                onToggleSent={(v) => onToggleSent(c, v)}
                onSave={(patch) => onSave(c.id, patch)}
                onRemove={() => onRemove(c)}
              />
            ))}
          </LetterColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeClinic ? (
          <div className="rounded-md bg-background border border-foreground shadow-lg px-3 py-2 text-sm w-[240px]">
            <div className="font-semibold truncate">{activeClinic.clinic_name}</div>
            <div className="text-xs text-muted-foreground truncate">{addresseeFor(activeClinic)}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function LetterColumn({
  colKey, title, hint, count, children,
}: {
  colKey: ColKey;
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey });
  return (
    <div
      className={`border rounded-md flex flex-col min-h-[240px] transition-colors ${isOver ? "bg-muted/60 border-foreground" : "bg-muted/20"}`}
    >
      <div className="px-3 py-2 border-b bg-background/60 rounded-t-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
          <span className="text-[10px] text-muted-foreground">{count}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <div ref={setNodeRef} className="flex-1 divide-y">
        {children}
      </div>
    </div>
  );
}

function DraggableLetterCard(props: {
  clinic: Clinic;
  covers: number;
  lastCall: LastCall | null;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  notesEditing: boolean;
  onStartNotesEdit: () => void;
  onStopNotesEdit: () => void;
  onToggleSent: (v: boolean) => void;
  onSave: (patch: { doctor_name?: string | null; address?: string | null; notes?: string | null }) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.clinic.id,
    data: { clinic: props.clinic },
  });
  if (props.editing || props.notesEditing) {
    return <LetterRow {...props} />;
  }
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
    >
      <LetterRow {...props} />
    </div>
  );
}


import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Printer, Download, Mail, Check, X } from "lucide-react";
import { toast } from "sonner";

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
  is_parent: boolean | null;
  parent_clinic_id: string | null;
  letter_sent: boolean;
  letter_sent_at: string | null;
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

type ChipFilter = "all" | "ready" | "needs";

function LetterCampaignPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [coversCounts, setCoversCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chip, setChip] = useState<ChipFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinics")
      .select("id, clinic_name, state, city, phone, email, owner_name, doctor_name, address, priority, status, is_parent, parent_clinic_id, letter_sent, letter_sent_at")
      .in("status", ELIGIBLE_STATUSES as unknown as string[])
      .or("is_parent.eq.true,parent_clinic_id.is.null")
      .limit(2000);
    if (error) {
      toast.error("Failed to load clinics");
      setLoading(false);
      return;
    }
    setClinics((data ?? []) as Clinic[]);

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
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clinics.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (chip === "ready" && (!c.address || c.letter_sent)) return false;
      if (chip === "needs" && (c.address || c.letter_sent)) return false;
      if (q) {
        const hay = `${c.clinic_name} ${c.city ?? ""} ${c.state ?? ""} ${c.address ?? ""} ${c.doctor_name ?? ""} ${c.owner_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clinics, search, statusFilter, chip]);

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

  const saveFields = async (id: string, patch: { doctor_name?: string | null; address?: string | null }) => {
    setClinics((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("clinics").update(patch).eq("id", id);
    if (error) toast.error("Could not save");
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

  const Chip = ({ id, label, count }: { id: ChipFilter; label: string; count: number }) => (
    <button
      type="button"
      onClick={() => setChip(id)}
      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
        chip === id ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );

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
        <p className="text-sm text-muted-foreground mb-4">
          Post every letter marked Private &amp; Confidential — it bypasses the front desk.
        </p>

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
          <div className="flex items-center gap-1.5">
            <Chip id="all" label="All" count={totals.toSend + totals.sent} />
            <Chip id="ready" label="Ready" count={totals.ready} />
            <Chip id="needs" label="Needs address" count={totals.needs} />
          </div>
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
          grouped.map(([priority, items]) => (
            <div key={priority} className="mb-5">
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70 mb-1.5 px-1">
                {priority} priority <span className="opacity-60">· {items.length}</span>
              </div>
              <div className="border rounded-md divide-y bg-background">
                {items.map((c) => (
                  <LetterRow
                    key={c.id}
                    clinic={c}
                    covers={coversCounts[c.id] ?? 0}
                    editing={editingId === c.id}
                    onStartEdit={() => setEditingId(c.id)}
                    onStopEdit={() => setEditingId(null)}
                    onToggleSent={(v) => toggleSent(c, v)}
                    onSave={(patch) => saveFields(c.id, patch)}
                  />
                ))}
              </div>
            </div>
          ))
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
  clinic, covers, editing, onStartEdit, onStopEdit, onToggleSent, onSave,
}: {
  clinic: Clinic;
  covers: number;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onToggleSent: (v: boolean) => void;
  onSave: (patch: { doctor_name?: string | null; address?: string | null }) => void;
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
        </div>
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={onStopEdit} className="h-7"><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          <Button size="sm" onClick={save} className="h-7"><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
        </div>
      </div>
    );
  }

  const hasAddress = !!clinic.address;

  return (
    <div
      className={`px-3 py-2 flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors ${sent ? "opacity-50" : ""}`}
      onClick={(e) => {
        // Don't trigger when clicking checkbox
        if ((e.target as HTMLElement).closest('[role="checkbox"], button')) return;
        onStartEdit();
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={sent} onCheckedChange={(v) => onToggleSent(Boolean(v))} />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className={`font-semibold ${sent ? "line-through" : ""}`}>{addressee}</span>
        <span className="text-muted-foreground/60">·</span>
        <span className={`text-muted-foreground ${sent ? "line-through" : ""}`}>{clinic.clinic_name}</span>
        {covers > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">covers {covers}</span>
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
  );
}

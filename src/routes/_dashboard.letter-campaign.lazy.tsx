import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Printer, Download, Mail, AlertCircle, Pencil, Check, X } from "lucide-react";
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

function LetterCampaignPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [coversCounts, setCoversCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hideSent, setHideSent] = useState(false);

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

    // Covers count: how many child clinics point to each id
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
      if (hideSent && c.letter_sent) return false;
      if (q) {
        const hay = `${c.clinic_name} ${c.city ?? ""} ${c.state ?? ""} ${c.address ?? ""} ${c.doctor_name ?? ""} ${c.owner_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clinics, search, statusFilter, hideSent]);

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
    return { total, sent, remaining: total - sent };
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

  const saveField = async (id: string, field: "doctor_name" | "address", value: string) => {
    const v = value.trim() === "" ? null : value;
    setClinics((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: v } : x)));
    const patch = field === "doctor_name" ? { doctor_name: v } : { address: v };
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

  return (
    <div className="p-6 max-w-7xl mx-auto letter-campaign">
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
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-6 w-6" style={{ color: "#f4522d" }} />
          <h1 className="text-2xl font-semibold">Letter Campaign</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <MetricCard label="Letters to send" value={totals.total} />
          <MetricCard label="Sent" value={totals.sent} accent="#10b981" />
          <MetricCard label="Remaining" value={totals.remaining} accent="#f4522d" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search clinic, city, state, doctor…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ELIGIBLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm select-none cursor-pointer px-2">
            <Checkbox checked={hideSent} onCheckedChange={(v) => setHideSent(Boolean(v))} />
            Hide sent
          </label>
          <Button variant="outline" onClick={printSheet}><Printer className="h-4 w-4 mr-1" />Print sheet</Button>
          <Button variant="outline" onClick={downloadCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center border rounded-md">No clinics match these filters.</div>
        ) : (
          grouped.map(([priority, items]) => (
            <div key={priority} className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {priority} priority · {items.length}
              </div>
              <div className="border rounded-md divide-y bg-white">
                {items.map((c) => (
                  <LetterRow
                    key={c.id}
                    clinic={c}
                    covers={coversCounts[c.id] ?? 0}
                    onToggleSent={(v) => toggleSent(c, v)}
                    onSaveField={(field, value) => saveField(c.id, field, value)}
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

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="border rounded-md p-4 bg-white">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold mt-1" style={{ color: accent ?? "#111" }}>{value}</div>
    </div>
  );
}

function LetterRow({
  clinic, covers, onToggleSent, onSaveField,
}: {
  clinic: Clinic;
  covers: number;
  onToggleSent: (v: boolean) => void;
  onSaveField: (field: "doctor_name" | "address", value: string) => void;
}) {
  const sent = clinic.letter_sent;
  const addressee = addresseeFor(clinic);
  return (
    <div
      className="p-3 flex items-start gap-3"
      style={sent ? { background: "#f9fafb", color: "#9ca3af", textDecoration: "line-through" } : undefined}
    >
      <Checkbox checked={sent} onCheckedChange={(v) => onToggleSent(Boolean(v))} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <InlineEdit
            value={clinic.doctor_name ?? ""}
            placeholder={addressee}
            onSave={(v) => onSaveField("doctor_name", v)}
            className="font-medium"
          />
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{clinic.clinic_name}</span>
          {covers > 0 && (
            <Badge style={{ background: "#dbeafe", color: "#1d4ed8" }} className="border-0">Covers {covers}</Badge>
          )}
          {clinic.state && (
            <Badge variant="outline">{STATES_ABBR[clinic.state] ?? clinic.state}</Badge>
          )}
          <Badge style={{ background: "#fef3c7", color: "#92400e" }} className="border-0">Private &amp; confidential</Badge>
          {sent && (
            <Badge style={{ background: "#dcfce7", color: "#166534" }} className="border-0">
              Sent {formatSentDate(clinic.letter_sent_at)}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
          {clinic.address ? (
            <InlineEdit
              value={clinic.address}
              onSave={(v) => onSaveField("address", v)}
              className="text-sm"
              multiline
            />
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Address needed — add before sending
              <InlineEdit
                value=""
                placeholder="Add address…"
                onSave={(v) => onSaveField("address", v)}
                className="text-sm ml-1"
                multiline
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineEdit({
  value, onSave, placeholder, className, multiline,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <span className={`inline-flex items-center gap-1 group ${className ?? ""}`}>
        <span>{value || <span className="text-muted-foreground italic">{placeholder ?? "—"}</span>}</span>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
          onClick={() => setEditing(true)}
          aria-label="Edit"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) { onSave(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
      <button type="button" onClick={() => { onSave(draft); setEditing(false); }} className="p-1 text-green-600" aria-label="Save">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => { setDraft(value); setEditing(false); }} className="p-1 text-muted-foreground" aria-label="Cancel">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

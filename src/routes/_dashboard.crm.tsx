import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClinicMetaLeads } from "@/components/ClinicMetaLeads";
import { useLegalMayOpen } from "@/legal/runtime/legal-menu";
import { ExternalLink, KanbanSquare, LayoutList, Loader2, Mail, MapPin, Phone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { legalAppLink, legalDb } from "@/lib/legal/client";
import { BusinessChip, BusinessSwitch } from "@/components/business/BusinessSwitch";
import { LegalConnectCard, useLegalSession } from "@/components/business/LegalConnect";
import { BUSINESS_COLOR, type Business, type BusinessView } from "@/lib/business";
import {
  HIDDEN_STAGES,
  PHASES,
  STAGES_BY_BUSINESS,
  daysSince,
  matchesSearch,
  phaseOf,
  stageDef,
  summarise,
  type CrmRecord,
  type Phase,
} from "@/lib/crm/model";

export const Route = createFileRoute("/_dashboard/crm")({
  head: () => ({ meta: [{ title: "CRM" }] }),
  validateSearch: (s: Record<string, unknown>): { biz?: BusinessView; tab?: CrmTab } => ({
    biz: s.biz === "hair" || s.biz === "legal" || s.biz === "both" ? s.biz : undefined,
    tab: s.tab === "firms" || s.tab === "meta-leads" ? s.tab : undefined,
  }),
  component: CrmPage,
});

const PAGE = 1000;

async function pageAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

type HairRow = {
  id: string;
  clinic_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  status: string;
  next_follow_up: string | null;
  created_at: string;
};

type LegalRow = {
  id: string;
  firm_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  stage: string;
  created_at: string;
  calendly_start_at: string | null;
  ad_name: string | null;
  campaign_name: string | null;
};

function useHairRecords() {
  const [state, setState] = useState<{ rows: CrmRecord[]; loading: boolean; error: string | null }>({ rows: [], loading: true, error: null });
  const load = useCallback(async () => {
    try {
      const rows = await pageAll<HairRow>((from, to) =>
        supabase
          .from("clinics")
          .select("id, clinic_name, owner_name, phone, email, city, state, status, next_follow_up, created_at")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to) as never,
      );
      setState({
        loading: false,
        error: null,
        rows: rows
          .filter((r) => !HIDDEN_STAGES.has(r.status))
          .map((r) => ({
            business: "hair",
            id: r.id,
            name: r.clinic_name,
            person: r.owner_name,
            phone: r.phone,
            email: r.email,
            city: [r.city, r.state].filter(Boolean).join(", ") || null,
            stage: r.status,
            createdAt: r.created_at,
            nextAt: r.next_follow_up,
            source: null,
          })),
      });
    } catch (e) {
      setState({ rows: [], loading: false, error: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load, setRows: (fn: (rows: CrmRecord[]) => CrmRecord[]) => setState((s) => ({ ...s, rows: fn(s.rows) })) };
}

function useLegalRecords(enabled: boolean) {
  const [state, setState] = useState<{ rows: CrmRecord[]; loading: boolean; error: string | null }>({ rows: [], loading: enabled, error: null });
  const load = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const rows = await pageAll<LegalRow>((from, to) =>
        legalDb()
          .from("firm_applications")
          .select("id, firm_name, first_name, last_name, phone, email, city, stage, created_at, calendly_start_at, ad_name, campaign_name")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      );
      setState({
        loading: false,
        error: null,
        rows: rows.map((r) => {
          const person = [r.first_name, r.last_name].filter(Boolean).join(" ") || null;
          return {
            business: "legal",
            id: r.id,
            name: r.firm_name || person || "Unnamed firm",
            person: r.firm_name ? person : null,
            phone: r.phone,
            email: r.email,
            city: r.city,
            stage: r.stage,
            createdAt: r.created_at,
            nextAt: r.calendly_start_at,
            source: r.ad_name || r.campaign_name,
          };
        }),
      });
    } catch (e) {
      setState({ rows: [], loading: false, error: (e as Error).message });
    }
  }, [enabled]);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load, setRows: (fn: (rows: CrmRecord[]) => CrmRecord[]) => setState((s) => ({ ...s, rows: fn(s.rows) })) };
}

async function writeStage(r: CrmRecord, stage: string): Promise<void> {
  if (r.business === "hair") {
    const { error } = await supabase.from("clinics").update({ status: stage }).eq("id", r.id);
    if (error) throw new Error(error.message);
    return;
  }
  const db = legalDb();
  const { error } = await db.from("firm_applications").update({ stage }).eq("id", r.id);
  if (error) throw new Error(error.message);
  // Same activity entry the Legal pipeline writes; never blocks the move.
  await db
    .from("firm_application_notes")
    .insert({ application_id: r.id, body: `Moved to ${stageDef("legal", stage).label}`, kind: "system" })
    .then(() => undefined, () => undefined);
}

type CrmTab = "pipeline" | "firms" | "meta-leads";

const LegalFirmsView = lazy(() => import("@/legal/LegalView").then((m) => ({ default: () => <m.LegalView path="/legal/firms" /> })));

// The CRM has three parts: the sales pipeline (clinics and law firms being
// won), the partner law firms Legal works with, and Clinic Meta Leads.
function CrmPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { role } = useAuth();
  const firmsOk = useLegalMayOpen("/firms");
  const tabs: { key: CrmTab; label: string; business?: Business }[] = [
    { key: "pipeline", label: "Pipeline" },
    ...(firmsOk ? [{ key: "firms" as const, label: "Law Firms", business: "legal" as const }] : []),
    ...(role === "admin" ? [{ key: "meta-leads" as const, label: "Clinic Meta Leads", business: "hair" as const }] : []),
  ];
  const tab: CrmTab = tabs.some((t) => t.key === search.tab) ? search.tab! : "pipeline";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 px-4 pt-4 md:px-6 md:pr-16">
        <KanbanSquare className="h-6 w-6" style={{ color: "#f4522d" }} />
        <h1 className="text-2xl font-extrabold" style={{ color: "#111" }}>CRM</h1>
        {tabs.length > 1 && (
          <nav aria-label="CRM sections" className="ml-2 flex items-center gap-1">
            {tabs.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate({ search: (s) => ({ ...s, tab: t.key === "pipeline" ? undefined : t.key }), replace: true })}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    background: active ? "#111" : "transparent",
                    color: active ? "#fff" : "#55554f",
                  }}
                >
                  {t.business && (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: BUSINESS_COLOR[t.business].fg }} />
                  )}
                  {t.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>
      {tab === "pipeline" ? (
        <PipelineView />
      ) : tab === "firms" ? (
        <div className="flex min-h-0 flex-1 flex-col pt-2">
          <Suspense fallback={<div className="flex items-center gap-2 px-6 py-8 text-sm" style={{ color: "#6b6b68" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading law firms…</div>}>
            <LegalFirmsView />
          </Suspense>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <ClinicMetaLeads />
        </div>
      )}
    </div>
  );
}

function PipelineView() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const view: BusinessView = search.biz ?? "both";
  const setView = (biz: BusinessView) => navigate({ search: (s) => ({ ...s, biz }), replace: true });

  const legal = useLegalSession();
  const hair = useHairRecords();
  const legalRows = useLegalRecords(!!legal.session);

  const [q, setQ] = useState("");
  const [layout, setLayout] = useState<"board" | "list">("board");
  const [showLost, setShowLost] = useState(false);
  const [openId, setOpenId] = useState<{ business: Business; id: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const all = useMemo(() => {
    const list: CrmRecord[] = [];
    if (view !== "legal") list.push(...hair.rows);
    if (view !== "hair") list.push(...legalRows.rows);
    return list.filter((r) => matchesSearch(r, q));
  }, [view, hair.rows, legalRows.rows, q]);

  const single: Business | null = view === "both" ? null : view;
  // Single business: its exact stages. Both: shared phases so they line up.
  const columns = useMemo(() => {
    if (single) {
      return STAGES_BY_BUSINESS[single]
        .filter((s) => showLost || s.phase !== "lost")
        .map((s) => ({ key: s.value, label: s.label, phase: s.phase, rows: all.filter((r) => r.stage === s.value) }));
    }
    return PHASES.filter((p) => showLost || p.key !== "lost").map((p) => ({
      key: p.key,
      label: p.label,
      phase: p.key as Phase,
      rows: all.filter((r) => phaseOf(r) === p.key),
    }));
  }, [single, all, showLost]);

  const hairSummary = useMemo(() => summarise(hair.rows), [hair.rows]);
  const legalSummary = useMemo(() => summarise(legalRows.rows), [legalRows.rows]);

  const open = openId
    ? (openId.business === "hair" ? hair.rows : legalRows.rows).find((r) => r.id === openId.id) ?? null
    : null;

  const move = async (r: CrmRecord, stage: string) => {
    if (r.stage === stage) return;
    const setter = r.business === "hair" ? hair.setRows : legalRows.setRows;
    const previous = r.stage;
    setter((rows) => rows.map((x) => (x.id === r.id ? { ...x, stage } : x)));
    try {
      await writeStage(r, stage);
      toast.success(`${r.name} → ${stageDef(r.business, stage).label}`);
    } catch (e) {
      setter((rows) => rows.map((x) => (x.id === r.id ? { ...x, stage: previous } : x)));
      toast.error((e as Error).message);
    }
  };

  const loading = (view !== "legal" && hair.loading) || (view !== "hair" && !!legal.session && legalRows.loading);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 px-4 pb-3 pt-3 md:px-6 md:pr-16">
        <BusinessSwitch value={view} onChange={setView} allowBoth />
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "#8a8a86" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, person, phone…"
            className="w-56 rounded-md py-1.5 pl-8 pr-2 text-sm outline-none"
            style={{ border: "1px solid #e6e6e3", background: "#fff" }}
          />
        </div>
        <div className="inline-flex rounded-md p-0.5" style={{ border: "1px solid #e6e6e3", background: "#fff" }}>
          {(["board", "list"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              aria-label={l === "board" ? "Board view" : "List view"}
              className="rounded px-2 py-1"
              style={{ background: layout === l ? "#f1f1ef" : "transparent" }}
            >
              {l === "board" ? <KanbanSquare className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#6b6b68" }}>
          <input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} /> Show lost
        </label>
      </header>

      <div className="grid shrink-0 gap-3 px-4 pb-3 md:grid-cols-2 md:px-6">
        {view !== "legal" && <SummaryCard business="hair" label="Clinics" s={hairSummary} loading={hair.loading} />}
        {view !== "hair" &&
          (legal.session ? (
            <SummaryCard business="legal" label="Law firms" s={legalSummary} loading={legalRows.loading} />
          ) : legal.ready ? (
            <LegalConnectCard compact />
          ) : null)}
      </div>

      {(hair.error || legalRows.error) && (
        <div className="mx-4 mb-2 rounded-md px-3 py-2 text-xs md:mx-6" style={{ background: "#fdf0f0", color: "#b83232" }}>
          {hair.error && <div>Hair: {hair.error}</div>}
          {legalRows.error && <div>Legal: {legalRows.error}</div>}
        </div>
      )}

      {loading && all.length === 0 ? (
        <div className="flex items-center gap-2 px-6 py-8 text-sm" style={{ color: "#6b6b68" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
        </div>
      ) : layout === "board" ? (
        <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-4 md:px-6">
          <div className="flex h-full min-h-[420px] gap-3">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex w-[264px] shrink-0 flex-col rounded-xl"
                style={{ background: "#f1f1ef" }}
                onDragOver={(e) => {
                  if (single && dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const r = all.find((x) => x.id === dragId);
                  setDragId(null);
                  if (r && single) void move(r, col.key);
                }}
              >
                <div className="flex items-center gap-2 px-3 pb-1.5 pt-2.5">
                  <span className="text-[12px] font-semibold" style={{ color: col.phase === "lost" ? "#8a8a86" : "#111" }}>{col.label}</span>
                  <span className="ml-auto rounded-full px-1.5 text-[11px] font-medium" style={{ background: "#fff", color: "#6b6b68" }}>{col.rows.length}</span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {col.rows.slice(0, 150).map((r) => (
                    <RecordCard
                      key={`${r.business}:${r.id}`}
                      r={r}
                      showStage={!single}
                      draggable={!!single}
                      onDragStart={() => setDragId(r.id)}
                      onOpen={() => setOpenId({ business: r.business, id: r.id })}
                    />
                  ))}
                  {col.rows.length > 150 && (
                    <div className="px-1 py-1 text-center text-[11px]" style={{ color: "#8a8a86" }}>
                      +{col.rows.length - 150} more — search to narrow
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ListView rows={all.filter((r) => showLost || phaseOf(r) !== "lost")} onOpen={(r) => setOpenId({ business: r.business, id: r.id })} />
      )}

      {open && <RecordDrawer r={open} onClose={() => setOpenId(null)} onMove={move} />}
    </div>
  );
}

function SummaryCard({ business, label, s, loading }: { business: Business; label: string; s: ReturnType<typeof summarise>; loading: boolean }) {
  const c = BUSINESS_COLOR[business];
  const stats = [
    { k: "In play", v: s.open },
    { k: "Meetings & proposals", v: s.meetings },
    { k: "Signed", v: s.signed },
    { k: "Lost", v: s.lost },
  ];
  return (
    <div className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ background: "#fff", border: `1px solid ${c.border}` }}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.fg }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: c.fg }}>{business === "hair" ? "Hair Transplants" : "Legal"}</div>
          <div className="text-[11px]" style={{ color: "#8a8a86" }}>{loading ? "Loading…" : `${s.total} ${label.toLowerCase()}`}</div>
        </div>
      </div>
      <div className="ml-auto grid grid-cols-4 gap-4">
        {stats.map((x) => (
          <div key={x.k} className="text-right">
            <div className="text-lg font-bold leading-none" style={{ color: "#111" }}>{loading ? "–" : x.v}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: "#8a8a86" }}>{x.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtDay(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function RecordCard({
  r,
  showStage,
  draggable,
  onDragStart,
  onOpen,
}: {
  r: CrmRecord;
  showStage: boolean;
  draggable: boolean;
  onDragStart: () => void;
  onOpen: () => void;
}) {
  const c = BUSINESS_COLOR[r.business];
  const age = daysSince(r.createdAt);
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      className="block w-full rounded-lg p-2.5 text-left transition-shadow hover:shadow-sm"
      style={{ background: "#fff", borderLeft: `3px solid ${c.fg}`, cursor: draggable ? "grab" : "pointer" }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium" style={{ color: "#111" }}>{r.name}</div>
          {r.person && <div className="truncate text-[11px]" style={{ color: "#6b6b68" }}>{r.person}</div>}
        </div>
        <BusinessChip business={r.business} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]" style={{ color: "#8a8a86" }}>
        {showStage && <span style={{ color: "#3f3f3c" }}>{stageDef(r.business, r.stage).label}</span>}
        {r.city && <span className="truncate">{r.city}</span>}
        {r.nextAt && <span style={{ color: c.fg }}>{r.business === "legal" ? "Meeting" : "Follow up"} {fmtDay(r.nextAt)}</span>}
        <span className="ml-auto">{age === 0 ? "today" : `${age}d`}</span>
      </div>
    </button>
  );
}

function ListView({ rows, onOpen }: { rows: CrmRecord[]; onOpen: (r: CrmRecord) => void }) {
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 1000);
  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 md:px-6">
      <table className="w-full overflow-hidden rounded-xl text-sm" style={{ background: "#fff", border: "1px solid #ebebeb" }}>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "#8a8a86", background: "#fafaf9" }}>
            <th className="px-3 py-2 font-medium">Business</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Stage</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">City</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">Phone</th>
            <th className="px-3 py-2 font-medium">Added</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={`${r.business}:${r.id}`} onClick={() => onOpen(r)} className="cursor-pointer hover:bg-neutral-50" style={{ borderTop: "1px solid #f3f3f1" }}>
              <td className="px-3 py-2"><BusinessChip business={r.business} /></td>
              <td className="px-3 py-2">
                <div className="font-medium" style={{ color: "#111" }}>{r.name}</div>
                {r.person && <div className="text-xs" style={{ color: "#6b6b68" }}>{r.person}</div>}
              </td>
              <td className="px-3 py-2" style={{ color: "#3f3f3c" }}>{stageDef(r.business, r.stage).label}</td>
              <td className="hidden px-3 py-2 md:table-cell" style={{ color: "#6b6b68" }}>{r.city ?? "—"}</td>
              <td className="hidden px-3 py-2 md:table-cell" style={{ color: "#6b6b68" }}>{r.phone ?? "—"}</td>
              <td className="px-3 py-2 text-xs" style={{ color: "#8a8a86" }}>{fmtDay(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ActivityItem = { id: string; at: string; text: string; kind: "note" | "system" | "contact" };

function useActivity(r: CrmRecord) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const load = useCallback(async () => {
    if (r.business === "legal") {
      const { data } = await legalDb()
        .from("firm_application_notes")
        .select("id, body, kind, created_at")
        .eq("application_id", r.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(
        ((data ?? []) as { id: string; body: string; kind: string; created_at: string }[]).map((n) => ({
          id: n.id,
          at: n.created_at,
          text: n.body,
          kind: n.kind === "system" ? "system" : "note",
        })),
      );
    } else {
      const { data } = await supabase
        .from("clinic_contacts")
        .select("id, contact_type, outcome, notes, created_at")
        .eq("clinic_id", r.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(
        (data ?? []).map((c) => ({
          id: c.id,
          at: c.created_at,
          text: [c.contact_type, c.outcome].filter(Boolean).join(" · ") + (c.notes ? ` — ${c.notes}` : ""),
          kind: "contact" as const,
        })),
      );
    }
  }, [r.business, r.id]);
  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);
  return { items, reload: load };
}

function RecordDrawer({ r, onClose, onMove }: { r: CrmRecord; onClose: () => void; onMove: (r: CrmRecord, stage: string) => Promise<void> }) {
  const c = BUSINESS_COLOR[r.business];
  const { items, reload } = useActivity(r);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const { error } =
      r.business === "legal"
        ? await legalDb().from("firm_application_notes").insert({ application_id: r.id, body: note.trim(), kind: "user" })
        : await supabase.from("clinic_contacts").insert({ clinic_id: r.id, contact_type: "Note", notes: note.trim() });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNote("");
    void reload();
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" style={{ background: "rgba(17,17,17,0.18)" }} onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-hidden"
        style={{ background: "#fff", borderLeft: `3px solid ${c.fg}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5" style={{ borderBottom: "1px solid #f1f1ef" }}>
          <div className="min-w-0 flex-1">
            <BusinessChip business={r.business} />
            <h2 className="mt-1.5 truncate text-lg font-bold" style={{ color: "#111" }}>{r.name}</h2>
            {r.person && <div className="text-sm" style={{ color: "#6b6b68" }}>{r.person}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#8a8a86" }}>Stage</div>
            <select
              value={r.stage}
              onChange={(e) => void onMove(r, e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{ border: `1px solid ${c.border}`, background: c.bg, color: "#111" }}
            >
              {!STAGES_BY_BUSINESS[r.business].some((s) => s.value === r.stage) && <option value={r.stage}>{r.stage}</option>}
              {STAGES_BY_BUSINESS[r.business].map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-sm">
            {r.phone && (
              <a href={`tel:${r.phone}`} className="flex items-center gap-2" style={{ color: "#111" }}>
                <Phone className="h-3.5 w-3.5" style={{ color: "#8a8a86" }} /> {r.phone}
              </a>
            )}
            {r.email && (
              <a href={`mailto:${r.email}`} className="flex items-center gap-2 truncate" style={{ color: "#111" }}>
                <Mail className="h-3.5 w-3.5" style={{ color: "#8a8a86" }} /> {r.email}
              </a>
            )}
            {r.city && (
              <div className="flex items-center gap-2" style={{ color: "#111" }}>
                <MapPin className="h-3.5 w-3.5" style={{ color: "#8a8a86" }} /> {r.city}
              </div>
            )}
            {r.source && <div className="text-xs" style={{ color: "#8a8a86" }}>From ad: {r.source}</div>}
            <div className="text-xs" style={{ color: "#8a8a86" }}>Added {fmtDay(r.createdAt)} · {daysSince(r.createdAt)} days ago</div>
          </div>

          {r.business === "hair" ? (
            <Link
              to="/clinics"
              search={{ clinic: r.id } as never}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ background: c.fg }}
            >
              Open full record — call, log, email <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <a
              href={legalAppLink("/firms").href}
              target={legalAppLink("/firms").external ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ background: c.fg }}
            >
              Open in Legal firm pipeline — call, SMS, proposal <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#8a8a86" }}>Activity</div>
            <div className="mb-3 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addNote()}
                placeholder="Add a note…"
                className="flex-1 rounded-md px-3 py-1.5 text-sm outline-none"
                style={{ border: "1px solid #e6e6e3" }}
              />
              <button
                type="button"
                onClick={() => void addNote()}
                disabled={saving || !note.trim()}
                className="rounded-md px-3 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#111" }}
              >
                Save
              </button>
            </div>
            {!items ? (
              <div className="text-xs" style={{ color: "#8a8a86" }}>Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-xs" style={{ color: "#8a8a86" }}>No activity yet.</div>
            ) : (
              <ol className="space-y-2.5">
                {items.map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.kind === "system" ? "#cfcfcb" : c.fg }} />
                    <div className="min-w-0">
                      <div className="whitespace-pre-wrap text-sm" style={{ color: a.kind === "system" ? "#6b6b68" : "#111" }}>{a.text}</div>
                      <div className="text-[11px]" style={{ color: "#a3a3a0" }}>
                        {new Date(a.at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

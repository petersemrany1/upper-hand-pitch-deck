import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ExternalLink, Check, ThumbsDown, Edit3, SkipForward, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_dashboard/clinic-owner-review")({
  head: () => ({ meta: [{ title: "Bulk Owner Review — Clinics CRM" }] }),
  component: BulkReviewPage,
});

type Clinic = {
  id: string;
  clinic_name: string;
  state: string | null;
  city: string | null;
  website: string | null;
  owner_name: string | null;
  owner_title: string | null;
  linkedin_url: string | null;
  owner_name_suggested: string | null;
  owner_title_suggested: string | null;
  linkedin_url_suggested: string | null;
  owner_source_url: string | null;
  owner_confidence: "high" | "medium" | "low" | null;
  owner_enrichment_status: "none" | "suggested" | "confirmed" | "not_found" | "error";
};

const CONCURRENCY = 3;

function BulkReviewPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });
  const cancelRef = useRef(false);
  const [cursor, setCursor] = useState(0);
  const [editingName, setEditingName] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clinics")
      .select("id,clinic_name,state,city,website,owner_name,owner_title,linkedin_url,owner_name_suggested,owner_title_suggested,linkedin_url_suggested,owner_source_url,owner_confidence,owner_enrichment_status")
      .order("clinic_name", { ascending: true });
    setClinics((data as Clinic[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Clinics that still need AI to look at them: not confirmed yet.
  // This includes: none, suggested (pending review), not_found, error,
  // AND manual entries (owner_name filled but status='none').
  const allToProcess = useMemo(
    () => clinics.filter((c) => c.owner_enrichment_status !== "confirmed"),
    [clinics],
  );

  // Anything that hasn't actually been hit by AI yet (no suggestion + not "not_found").
  const needsEnrichment = useMemo(
    () => allToProcess.filter((c) =>
      c.owner_enrichment_status === "none" || c.owner_enrichment_status === "error"
    ),
    [allToProcess],
  );

  // Reviewable queue — anything where AI returned a suggestion needing a decision.
  const reviewQueue = useMemo(
    () => allToProcess.filter((c) => c.owner_enrichment_status === "suggested" && c.owner_name_suggested),
    [allToProcess],
  );

  const confirmedCount = clinics.length - allToProcess.length;
  const notFoundCount = allToProcess.filter((c) => c.owner_enrichment_status === "not_found").length;

  const current = reviewQueue[cursor] ?? null;

  useEffect(() => {
    if (cursor >= reviewQueue.length && reviewQueue.length > 0) {
      setCursor(Math.max(0, reviewQueue.length - 1));
    }
  }, [cursor, reviewQueue.length]);

  useEffect(() => {
    setIsEditing(false);
    setEditingName(current?.owner_name_suggested ?? "");
    setEditingTitle(current?.owner_title_suggested ?? "");
  }, [current?.id]);

  const refreshClinic = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("clinics")
      .select("id,clinic_name,state,city,website,owner_name,owner_title,linkedin_url,owner_name_suggested,owner_title_suggested,linkedin_url_suggested,owner_source_url,owner_confidence,owner_enrichment_status")
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    setClinics((prev) => prev.map((c) => c.id === id ? (data as Clinic) : c));
  }, []);

  const enrichOne = useCallback(async (id: string) => {
    setEnrichingIds((p) => { const n = new Set(p); n.add(id); return n; });
    try {
      const { error } = await supabase.functions.invoke("enrich-clinic-owner", { body: { clinic_id: id } });
      if (error) {
        toast.error(`AI research failed: ${error.message}`);
        return false;
      }
      await refreshClinic(id);
      return true;
    } finally {
      setEnrichingIds((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }, [refreshClinic]);

  const startBatch = useCallback(async () => {
    const targets = needsEnrichment.map((c) => c.id);
    if (targets.length === 0) {
      toast.info("Nothing left to research — every clinic has already been hit by AI.");
      return;
    }
    cancelRef.current = false;
    setBatch({ running: true, done: 0, total: targets.length });
    let i = 0;
    let done = 0;
    const worker = async () => {
      while (true) {
        if (cancelRef.current) return;
        const idx = i++;
        if (idx >= targets.length) return;
        await enrichOne(targets[idx]);
        done++;
        setBatch((p) => ({ ...p, done }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
    setBatch({ running: false, done: 0, total: 0 });
    toast.success("AI research complete. Review the suggestions below.");
  }, [needsEnrichment, enrichOne]);

  const cancelBatch = useCallback(() => { cancelRef.current = true; }, []);

  const confirmCurrent = useCallback(async (overrideName?: string, overrideTitle?: string) => {
    if (!current) return;
    const name = (overrideName ?? current.owner_name_suggested ?? "").trim();
    if (!name) { toast.error("Owner name is empty"); return; }
    const title = overrideTitle ?? current.owner_title_suggested ?? null;
    await supabase.from("clinics").update({
      owner_name: name,
      owner_title: title,
      linkedin_url: current.linkedin_url_suggested,
      owner_enrichment_status: "confirmed",
      owner_name_suggested: null,
      owner_title_suggested: null,
      linkedin_url_suggested: null,
    }).eq("id", current.id);
    await refreshClinic(current.id);
    toast.success(`Confirmed: ${name}`);
  }, [current, refreshClinic]);

  const rejectCurrent = useCallback(async () => {
    if (!current) return;
    await supabase.from("clinics").update({
      owner_enrichment_status: "none",
      owner_name_suggested: null,
      owner_title_suggested: null,
      linkedin_url_suggested: null,
    }).eq("id", current.id);
    await refreshClinic(current.id);
    toast("Rejected", { description: current.clinic_name });
  }, [current, refreshClinic]);

  const skipCurrent = useCallback(() => {
    if (reviewQueue.length === 0) return;
    setCursor((c) => (c + 1) % reviewQueue.length);
  }, [reviewQueue.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditing) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "y" || e.key === "Y") { e.preventDefault(); void confirmCurrent(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); void rejectCurrent(); }
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); setIsEditing(true); }
      else if (e.key === "s" || e.key === "S" || e.key === "ArrowRight") { e.preventDefault(); skipCurrent(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmCurrent, rejectCurrent, skipCurrent, isEditing]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Link to="/clinics" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Clinics CRM
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>Bulk Owner Review</h1>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Run AI on every clinic, then rip through the suggestions with one click.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total clinics" value={clinics.length} />
        <StatCard label="Confirmed" value={confirmedCount} color="#16a34a" />
        <StatCard label="To review" value={reviewQueue.length} color="#f59e0b" />
        <StatCard label="Not yet researched" value={needsEnrichment.length} color="#6b7280" />
      </div>

      {/* Batch control */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16, background: "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong>{needsEnrichment.length}</strong> clinics still need AI research
            {notFoundCount > 0 && <span style={{ color: "#6b7280" }}> · {notFoundCount} marked “not found”</span>}
          </div>
          {batch.running ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 13 }}>
                <Loader2 size={14} className="inline animate-spin" style={{ marginRight: 6 }} />
                {batch.done} / {batch.total}
              </div>
              <Button size="sm" variant="outline" onClick={cancelBatch}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" onClick={startBatch} disabled={needsEnrichment.length === 0}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              Research all {needsEnrichment.length}
            </Button>
          )}
        </div>
        {batch.running && (
          <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${batch.total ? (batch.done / batch.total) * 100 : 0}%`, height: "100%", background: "#3b82f6", transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      {/* Review pane */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <Loader2 size={24} className="animate-spin inline" />
        </div>
      ) : reviewQueue.length === 0 ? (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 12, padding: 40, textAlign: "center", color: "#6b7280" }}>
          {needsEnrichment.length > 0
            ? "No suggestions waiting. Click “Research all” above to generate them."
            : "🎉 All clinics processed. Nothing left to review."}
        </div>
      ) : current ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
            <span>Reviewing {cursor + 1} of {reviewQueue.length}</span>
            <span>Shortcuts: <kbd>Y</kbd> confirm · <kbd>N</kbd> reject · <kbd>E</kbd> edit · <kbd>S</kbd> skip</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {/* Left: Clinic */}
            <div style={{ padding: 20, borderRight: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Clinic</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{current.clinic_name}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                {[current.city, current.state].filter(Boolean).join(", ") || "—"}
              </div>
              {current.website && (
                <a href={current.website.startsWith("http") ? current.website : `https://${current.website}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {current.website} <ExternalLink size={12} />
                </a>
              )}
              {current.owner_name && (
                <div style={{ marginTop: 14, padding: 10, background: "#eff6ff", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: "#1e40af", fontWeight: 600, marginBottom: 2 }}>Manual entry on file</div>
                  <div style={{ color: "#374151" }}>{current.owner_name}{current.owner_title ? ` — ${current.owner_title}` : ""}</div>
                </div>
              )}
            </div>

            {/* Right: AI suggestion */}
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>AI Suggestion</div>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                  background: current.owner_confidence === "high" ? "#dcfce7" : current.owner_confidence === "medium" ? "#fef3c7" : "#f3f4f6",
                  color: current.owner_confidence === "high" ? "#166534" : current.owner_confidence === "medium" ? "#92400e" : "#6b7280",
                }}>{current.owner_confidence || "low"} confidence</span>
              </div>

              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} placeholder="Owner name" autoFocus />
                  <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} placeholder="Title (e.g. Founder)" />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{current.owner_name_suggested}</div>
                  {current.owner_title_suggested && (
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{current.owner_title_suggested}</div>
                  )}
                </>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {current.linkedin_url_suggested && (
                  <a href={current.linkedin_url_suggested} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    LinkedIn <ExternalLink size={11} />
                  </a>
                )}
                {current.owner_source_url && (
                  <a href={current.owner_source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Source <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={() => { void confirmCurrent(editingName, editingTitle); setIsEditing(false); }} style={{ background: "#16a34a" }}>
                      <Check size={14} style={{ marginRight: 4 }} /> Save & confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => void confirmCurrent()} style={{ background: "#16a34a" }}>
                      <Check size={14} style={{ marginRight: 4 }} /> Confirm (Y)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void rejectCurrent()}>
                      <ThumbsDown size={14} style={{ marginRight: 4 }} /> Reject (N)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit3 size={14} style={{ marginRight: 4 }} /> Edit (E)
                    </Button>
                    <Button size="sm" variant="ghost" onClick={skipCurrent}>
                      <SkipForward size={14} style={{ marginRight: 4 }} /> Skip (S)
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick re-run for not_found */}
      {!batch.running && notFoundCount > 0 && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#6b7280", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{notFoundCount} clinics returned “not found” — try re-running AI on them.</span>
          <Button size="sm" variant="outline" onClick={async () => {
            const targets = allToProcess.filter((c) => c.owner_enrichment_status === "not_found").map((c) => c.id);
            cancelRef.current = false;
            setBatch({ running: true, done: 0, total: targets.length });
            let i = 0, done = 0;
            const worker = async () => {
              while (true) {
                if (cancelRef.current) return;
                const idx = i++;
                if (idx >= targets.length) return;
                await enrichOne(targets[idx]);
                done++;
                setBatch((p) => ({ ...p, done }));
              }
            };
            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
            setBatch({ running: false, done: 0, total: 0 });
          }}>Retry not-found</Button>
        </div>
      )}

      {enrichingIds.size > 0 && !batch.running && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          <Loader2 size={12} className="inline animate-spin" style={{ marginRight: 4 }} />
          Researching {enrichingIds.size}…
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "#111827", marginTop: 4 }}>{value}</div>
    </div>
  );
}

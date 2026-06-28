import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ExternalLink, Check, ThumbsDown, Edit3, SkipForward, ArrowLeft, Sparkles, Copy } from "lucide-react";

export const Route = createFileRoute("/_dashboard/clinic-contact-review")({
  head: () => ({ meta: [{ title: "Bulk Director Contact Review — Clinics CRM" }] }),
  component: BulkContactReviewPage,
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
  owner_email: string | null;
  owner_linkedin_suggested: string | null;
  owner_email_suggested: string | null;
  contact_source_url: string | null;
  contact_confidence: "high" | "medium" | "low" | null;
  contact_enrichment_status: "none" | "suggested" | "confirmed" | "not_found" | "error" | null;
  owner_enrichment_status: string | null;
};

const CONCURRENCY = 3;
const SELECT_COLS = "id,clinic_name,state,city,website,owner_name,owner_title,linkedin_url,owner_email,owner_linkedin_suggested,owner_email_suggested,contact_source_url,contact_confidence,contact_enrichment_status,owner_enrichment_status";

function BulkContactReviewPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });
  const cancelRef = useRef(false);
  const [cursor, setCursor] = useState(0);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingLinkedin, setEditingLinkedin] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clinics")
      .select(SELECT_COLS)
      .order("clinic_name", { ascending: true });
    setClinics((data as Clinic[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Only consider clinics with a confirmed owner — can't find contact without a name.
  const eligible = useMemo(
    () => clinics.filter((c) => c.owner_name && c.owner_name.trim() !== ""),
    [clinics],
  );

  const allToProcess = useMemo(
    () => eligible.filter((c) => c.contact_enrichment_status !== "confirmed"),
    [eligible],
  );

  const needsEnrichment = useMemo(
    () => allToProcess.filter((c) =>
      !c.contact_enrichment_status || c.contact_enrichment_status === "none" || c.contact_enrichment_status === "error"
    ),
    [allToProcess],
  );

  const reviewQueue = useMemo(
    () => allToProcess.filter((c) =>
      c.contact_enrichment_status === "suggested" && (c.owner_linkedin_suggested || c.owner_email_suggested)
    ),
    [allToProcess],
  );

  const confirmedCount = eligible.filter((c) => c.contact_enrichment_status === "confirmed").length;
  const notFoundCount = allToProcess.filter((c) => c.contact_enrichment_status === "not_found").length;

  const current = reviewQueue[cursor] ?? null;

  useEffect(() => {
    if (cursor >= reviewQueue.length && reviewQueue.length > 0) {
      setCursor(Math.max(0, reviewQueue.length - 1));
    }
  }, [cursor, reviewQueue.length]);

  useEffect(() => {
    setIsEditing(false);
    setEditingEmail(current?.owner_email_suggested ?? "");
    setEditingLinkedin(current?.owner_linkedin_suggested ?? "");
  }, [current?.id]);

  const refreshClinic = useCallback(async (id: string) => {
    const { data } = await supabase.from("clinics").select(SELECT_COLS).eq("id", id).maybeSingle();
    if (!data) return;
    setClinics((prev) => prev.map((c) => c.id === id ? (data as Clinic) : c));
  }, []);

  const enrichOne = useCallback(async (id: string) => {
    setEnrichingIds((p) => { const n = new Set(p); n.add(id); return n; });
    try {
      const { error } = await supabase.functions.invoke("enrich-clinic-contact", { body: { clinic_id: id } });
      if (error) { toast.error(`AI research failed: ${error.message}`); return false; }
      await refreshClinic(id);
      return true;
    } finally {
      setEnrichingIds((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }, [refreshClinic]);

  const runBatch = useCallback(async (targetIds: string[]) => {
    if (targetIds.length === 0) { toast.info("Nothing to research."); return; }
    cancelRef.current = false;
    setBatch({ running: true, done: 0, total: targetIds.length });
    let i = 0, done = 0;
    const worker = async () => {
      while (true) {
        if (cancelRef.current) return;
        const idx = i++;
        if (idx >= targetIds.length) return;
        await enrichOne(targetIds[idx]);
        done++;
        setBatch((p) => ({ ...p, done }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targetIds.length) }, () => worker()));
    setBatch({ running: false, done: 0, total: 0 });
    toast.success("AI research complete.");
  }, [enrichOne]);

  const cancelBatch = useCallback(() => { cancelRef.current = true; }, []);

  const confirmCurrent = useCallback(async (overrideEmail?: string, overrideLinkedin?: string) => {
    if (!current) return;
    const email = (overrideEmail ?? current.owner_email_suggested ?? "").trim() || null;
    const linkedin = (overrideLinkedin ?? current.owner_linkedin_suggested ?? "").trim() || null;
    if (!email && !linkedin) { toast.error("Need at least an email or a LinkedIn URL"); return; }
    await supabase.from("clinics").update({
      owner_email: email,
      linkedin_url: linkedin,
      contact_enrichment_status: "confirmed",
      owner_email_suggested: null,
      owner_linkedin_suggested: null,
    }).eq("id", current.id);
    await refreshClinic(current.id);
    toast.success(`Confirmed contact for ${current.owner_name}`);
  }, [current, refreshClinic]);

  const rejectCurrent = useCallback(async () => {
    if (!current) return;
    await supabase.from("clinics").update({
      contact_enrichment_status: "none",
      owner_email_suggested: null,
      owner_linkedin_suggested: null,
    }).eq("id", current.id);
    await refreshClinic(current.id);
    toast("Rejected", { description: current.clinic_name });
  }, [current, refreshClinic]);

  const skipCurrent = useCallback(() => {
    if (reviewQueue.length === 0) return;
    setCursor((c) => (c + 1) % reviewQueue.length);
  }, [reviewQueue.length]);

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

  const noOwnerCount = clinics.length - eligible.length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/clinics" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to Clinics CRM
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>Bulk Director Contact Review</h1>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Find LinkedIn + email for every confirmed owner, then confirm with one click. {noOwnerCount > 0 && <span style={{ color: "#f59e0b" }}>· {noOwnerCount} clinics skipped (no confirmed owner yet)</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Eligible (have owner)" value={eligible.length} />
        <StatCard label="Contact confirmed" value={confirmedCount} color="#16a34a" />
        <StatCard label="To review" value={reviewQueue.length} color="#f59e0b" />
        <StatCard label="Not yet researched" value={needsEnrichment.length} color="#6b7280" />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16, background: "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong>{needsEnrichment.length}</strong> owners still need AI research
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
            <Button size="sm" onClick={() => void runBatch(needsEnrichment.map((c) => c.id))} disabled={needsEnrichment.length === 0}>
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

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <Loader2 size={24} className="animate-spin inline" />
        </div>
      ) : reviewQueue.length === 0 ? (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 12, padding: 40, textAlign: "center", color: "#6b7280" }}>
          {needsEnrichment.length > 0
            ? "No suggestions waiting. Click “Research all” above to generate them."
            : "🎉 All eligible clinics processed. Nothing left to review."}
        </div>
      ) : current ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
            <span>Reviewing {cursor + 1} of {reviewQueue.length}</span>
            <span>Shortcuts: <kbd>Y</kbd> confirm · <kbd>N</kbd> reject · <kbd>E</kbd> edit · <kbd>S</kbd> skip</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ padding: 20, borderRight: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Owner</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{current.owner_name}</div>
              {current.owner_title && <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{current.owner_title}</div>}
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>{current.clinic_name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                {[current.city, current.state].filter(Boolean).join(", ") || "—"}
              </div>
              {current.website && (
                <a href={current.website.startsWith("http") ? current.website : `https://${current.website}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {current.website} <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>AI Suggestion</div>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                  background: current.contact_confidence === "high" ? "#dcfce7" : current.contact_confidence === "medium" ? "#fef3c7" : "#f3f4f6",
                  color: current.contact_confidence === "high" ? "#166534" : current.contact_confidence === "medium" ? "#92400e" : "#6b7280",
                }}>{current.contact_confidence || "low"} confidence</span>
              </div>

              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Input value={editingEmail} onChange={(e) => setEditingEmail(e.target.value)} placeholder="Email" autoFocus />
                  <Input value={editingLinkedin} onChange={(e) => setEditingLinkedin(e.target.value)} placeholder="LinkedIn URL" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <FieldRow label="Email" value={current.owner_email_suggested} copyable />
                  <FieldRow label="LinkedIn" value={current.owner_linkedin_suggested} link />
                  {current.contact_source_url && (
                    <a href={current.contact_source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Source <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={() => { void confirmCurrent(editingEmail, editingLinkedin); setIsEditing(false); }} style={{ background: "#16a34a" }}>
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

      {!batch.running && notFoundCount > 0 && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#6b7280", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{notFoundCount} owners returned “not found” — re-run AI on them.</span>
          <Button size="sm" variant="outline" onClick={() => void runBatch(allToProcess.filter((c) => c.contact_enrichment_status === "not_found").map((c) => c.id))}>
            Retry not-found
          </Button>
        </div>
      )}

      {enrichingIds.size > 0 && (
        <div style={{ position: "fixed", bottom: 16, right: 16, background: "#111827", color: "#fff", padding: "8px 14px", borderRadius: 999, fontSize: 12 }}>
          <Loader2 size={12} className="inline animate-spin" style={{ marginRight: 6 }} />
          {enrichingIds.size} in flight
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "#111827", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function FieldRow({ label, value, copyable, link }: { label: string; value: string | null; copyable?: boolean; link?: boolean }) {
  if (!value) {
    return (
      <div>
        <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>Not found</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {link ? (
          <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: "#3b82f6", wordBreak: "break-all" }}>
            {value}
          </a>
        ) : (
          <span style={{ fontSize: 14, color: "#111827", wordBreak: "break-all" }}>{value}</span>
        )}
        {copyable && (
          <button onClick={() => { void navigator.clipboard.writeText(value); toast.success("Copied"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 2 }}>
            <Copy size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Camera, ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";
import PatientNorwoodCapture from "@/components/norwood/PatientNorwoodCapture";
import AiNorwoodAssessment from "@/components/norwood/AiNorwoodAssessment";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { createNorwoodPreviewSession } from "@/lib/norwood-preview-session";
import { isNorwoodPreviewHost } from "@/lib/norwood-preview-access";
import { analyseNorwoodPreview, getNorwoodPreviewReadiness } from "@/utils/norwood-preview.functions";
import "@/components/norwood/norwood-preview.css";

export const Route = createFileRoute("/norwood-preview")({
  head: () => ({ meta: [{ title: "Norwood test preview" }, { name: "robots", content: "noindex, nofollow, noarchive" }, { name: "referrer", content: "no-referrer" }] }),
  component: NorwoodPreview,
});

function NorwoodPreview() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [clinic, setClinic] = useState("Hair Transplant Group");
  const [activeClinic, setActiveClinic] = useState("Hair Transplant Group");
  const [run, setRun] = useState(0);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState("");
  useEffect(() => {
    const enabled = isNorwoodPreviewHost(window.location.hostname); setAllowed(enabled);
    if (enabled) void getNorwoodPreviewReadiness().then(data => setConfigured(data.aiConfigured)).catch(() => setConnectionError("The preview AI connection could not be checked. You can still explore the photo steps."));
  }, []);
  if (!allowed) return <main className="np-container">{allowed === null ? "Opening preview…" : "This test is available only in the preview environment."}</main>;
  return <main className="np-container">
    <header className="np-header"><div><p className="np-eyebrow">PRIVATE WORKFLOW TEST</p><h1>Try the Norwood photo check</h1><p>Take your five photos, then see the patient result and the rep’s review.</p></div><span className="np-badge"><ShieldCheck size={16} />Preview only</span></header>
    <div className="np-notice">This test sends no texts, changes no leads and creates no bookings. Photos stay in this tab until you request analysis, when they are sent to Anthropic. Resetting or closing the tab clears the preview’s copy.</div>
    <section className="np-toolbar" aria-label="Preview setup"><label>Clinic branding<select value={clinic} onChange={e => setClinic(e.target.value)}><option>Hair Transplant Group</option><option>Boss Clinic</option><option>Gro Clinics – Sydney</option><option>Bijan Clinic</option><option>Nitai</option></select></label><button className="np-button" onClick={() => { setActiveClinic(clinic); setRun(n => n + 1); }}><RotateCcw size={16} />Reset / apply clinic</button><span role="status">{connectionError || (configured === null ? "Checking AI connection…" : configured ? "AI connection configured" : "AI connection needs setup")}</span></section>
    <PreviewSession key={run} clinic={activeClinic} configured={configured} />
    <footer className="np-footer"><strong>What this preview tests:</strong> photo instructions, camera/upload, quality checks, real AI estimates and rep confirmation. SMS delivery, a link across separate devices, private-bucket storage and booking handover need the full integration test later.</footer>
  </main>;
}

function PreviewSession({ clinic, configured }: { clinic: string; configured: boolean | null }) {
  const { session: auth, ready } = useAuth();
  const [token] = useState(() => typeof crypto !== "undefined" ? btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") : "");
  const store = useMemo(() => createNorwoodPreviewSession(clinic, token, async photos => {
    // Fetch obtains the current auth token through the app's existing server-function wrapper.
    try {
      const result = await analyseNorwoodPreview({ data: { photos, consent: true } });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    } catch (error) {
      if (error instanceof Error && /Unauthorized|401|Sales access/.test(error.message)) throw new Error("Sign in with your admin or rep account before running a real AI estimate.");
      throw error;
    }
  }), [clinic, token]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [selected, setSelected] = useState<number | null>(null), [expectations, setExpectations] = useState<number | null>(null);
  useEffect(() => { store.activate(); return () => store.dispose(); }, [store]);
  useEffect(() => { setSelected(null); setExpectations(null); }, [state.generation]);
  const confirm = (value: number) => { setSelected(value); if (value >= 6) setExpectations(value); else store.confirm(value); };
  return <>
    {ready && !auth && <div className="np-signin"><strong>Sign in before testing the real AI.</strong><p>You can explore the screens now. Sign in first to analyse your own photos; navigating away clears this test.</p><a href="/login?redirect=%2Fnorwood-preview">Sign in with your staff account <ExternalLink size={14} /></a></div>}
    {configured === false && <p className="np-notice">Camera and photo guidance work now. A real estimate needs ANTHROPIC_API_KEY configured in the preview server.</p>}
    <div className="np-grid">
      <section className="np-phone" aria-label="Patient phone preview"><div className="np-panel-title"><Camera size={17} /><h2>Patient’s phone</h2></div>{state.started ? <PatientNorwoodCapture key={state.generation} api={store.patientApi} linkToken={token} /> : <div className="np-start"><h2>Ready to try it yourself?</h2><p>Start a test, then follow the five photo guides. You can use your camera or choose existing photos.</p><button className="np-button np-primary" onClick={() => void store.repApi.sendAiNorwoodLink({})}>Start test session</button></div>}</section>
      <aside className="np-rep" aria-label="Rep review preview"><div className="np-panel-title"><h2>Rep’s call screen</h2><span>Test patient</span></div><p className="np-caption">Both views share this browser tab for the preview. Progress updates while you take photos.</p>
        <AiNorwoodAssessment key={state.generation} leadId="preview-lead" clinicId="preview-clinic" api={store.repApi} onSuggestion={() => {}} />
        <section className="np-confirm"><h3>Confirm Norwood</h3><p>The AI suggestion is highlighted. Choose a number to confirm or change it.</p><div className="np-grades">{[1,2,3,4,5,6,7].map(value => <button key={value} disabled={!state.result} aria-label={`Confirm Norwood ${value}`} aria-pressed={state.finalNorwood === value} className={state.finalNorwood === value ? "confirmed" : selected === value || (!selected && state.result?.norwood === value) ? "suggested" : ""} onClick={() => confirm(value)}>{value}</button>)}</div>
          <p role="status">{state.finalNorwood == null ? "Rep confirmation required." : `Rep confirmed Norwood ${state.finalNorwood}. Original AI estimate: ${state.result?.norwood}.`}</p><div className="np-button" role="status">Booking gate {state.finalNorwood == null ? "locked" : "passed"} · preview only</div>
        </section>
      </aside>
    </div>
    <Dialog open={expectations !== null} onOpenChange={open => { if (!open) { setExpectations(null); setSelected(state.finalNorwood); } }}><DialogContent><DialogTitle>Have you set the expectations?</DialogTitle><DialogDescription>Norwood 6–7 requires the rep’s expectations check before continuing. This preview does not book an appointment.</DialogDescription><button className="np-button np-primary" onClick={() => { if (expectations !== null) store.confirm(expectations); setExpectations(null); }}>Yes, expectations are set</button></DialogContent></Dialog>
  </>;
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import AiNorwoodAssessment from "./AiNorwoodAssessment";
import type { NorwoodSuggestion } from "@/lib/norwood-assessment";
import { isNorwoodPreviewHost } from "@/lib/norwood-preview-access";
import { NORWOOD_SANDBOX_LEAD_IDS } from "@/lib/norwood-sandbox-access";
import { confirmSandboxNorwood, getNorwoodSandboxReadiness, getNorwoodPhotoLinks, getRepNorwoodAssessment, retryRepNorwoodAssessment, sendAiNorwoodLink } from "@/utils/norwood-sandbox.functions";

const api = { getNorwoodPhotoLinks, getRepNorwoodAssessment, retryRepNorwoodAssessment, sendAiNorwoodLink };
type State = { enabled: boolean; suggestions: Record<string, NorwoodSuggestion | null>; offer: (leadId: string, value: NorwoodSuggestion | null) => void };
const Context = createContext<State | null>(null);

// Only the sales-call-test route installs this provider. All server actions also
// enforce the exact preview hosts and the two existing sandbox lead IDs.
export function NorwoodSandboxProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<State["suggestions"]>({});
  useEffect(() => setEnabled(isNorwoodPreviewHost(window.location.hostname)), []);
  const offer = useCallback((leadId: string, value: NorwoodSuggestion | null) => {
    setSuggestions(previous => ({ ...previous, [leadId]: value }));
  }, []);
  return <Context.Provider value={{ enabled, suggestions, offer }}>{children}</Context.Provider>;
}

export function NorwoodSandboxPanel({ leadId, clinicId, phone }: { leadId: string; clinicId: string; phone: string | null }) {
  const context = useContext(Context);
  const [ready, setReady] = useState(false), [setupMessage, setSetupMessage] = useState("Checking phone test setup…");
  useEffect(() => {
    setReady(false); setSetupMessage("Checking phone test setup…");
    if (!context?.enabled || !NORWOOD_SANDBOX_LEAD_IDS.has(leadId)) return;
    let cancelled = false;
    void getNorwoodSandboxReadiness({ data: { leadId } }).then(result => {
      if (cancelled) return;
      setReady(result.ok); setSetupMessage(result.ok ? "" : result.error);
    }).catch(() => { if (!cancelled) setSetupMessage("The phone test setup could not be checked. Refresh to try again."); });
    return () => { cancelled = true; };
  }, [context?.enabled, leadId]);
  if (!context?.enabled || !NORWOOD_SANDBOX_LEAD_IDS.has(leadId)) return null;
  return <div style={{ padding: "14px 18px", borderTop: "0.5px solid #e5e5e5" }}>
    <p className="mb-2 text-xs text-muted-foreground">Phone test · SMS goes to this test lead’s mobile: <strong>{phone || "Add a mobile number first"}</strong></p>
    <AiNorwoodAssessment key={leadId} leadId={leadId} clinicId={clinicId} api={api} mode="sms" sendingDisabled={!ready} onSuggestion={value => context.offer(leadId, value)} />
    {setupMessage && <p className="mt-2 text-xs text-amber-800" role="status">{setupMessage}</p>}
  </div>;
}

export function useNorwoodSandboxReview(
  leadId: string,
  setNorwood: (value: number | null) => void,
  setExpectations: (value: "yes" | "no" | null) => void,
) {
  const context = useContext(Context);
  const enabled = Boolean(context?.enabled && NORWOOD_SANDBOX_LEAD_IDS.has(leadId));
  const suggestion = enabled ? context?.suggestions[leadId] ?? null : null;
  const [saving, setSaving] = useState(false);
  const lock = useRef(false), generation = useRef(0);
  const latest = useRef(suggestion); latest.current = suggestion;
  useEffect(() => {
    generation.current++;
    if (suggestion && suggestion.finalNorwood == null) {
      // Highlighting the AI estimate must never satisfy the existing booking gate.
      setNorwood(null); setExpectations(null);
    }
    return () => { generation.current++; };
  }, [leadId, suggestion?.assessmentId]);
  async function confirm(value: number, applyExistingSelection: () => void) {
    if (lock.current) return;
    const assessment = latest.current;
    if (!enabled || !assessment) { applyExistingSelection(); return; }
    const version = generation.current;
    lock.current = true; setSaving(true);
    try {
      const result = await confirmSandboxNorwood({ data: { leadId, assessmentId: assessment.assessmentId, norwood: value } });
      if (!result.ok) throw new Error(result.error);
      if (version !== generation.current || latest.current?.assessmentId !== assessment.assessmentId) return;
      context?.offer(leadId, { ...assessment, finalNorwood: value });
      applyExistingSelection();
    } catch (error) {
      if (version === generation.current) toast.error(error instanceof Error ? error.message : "Could not save the Norwood review. Please try again.");
    } finally { lock.current = false; setSaving(false); }
  }
  return { suggestion: suggestion?.finalNorwood == null ? suggestion?.norwood ?? null : null, saving, confirm };
}

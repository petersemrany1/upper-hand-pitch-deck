import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { recordLeadSkip } from "./lead-skips";

export function SkipLeadDialog({ leadId, leadName, sessionId, onSaved, onCancel }: {
  leadId: string; leadName: string; sessionId: string | null; onSaved: () => void; onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const request = useRef<{ id: string; leadId: string; sessionId: string | null; reason: string } | null>(null);
  const save = async () => {
    if (busy.current) return;
    if (reason.trim().length < 3 || reason.trim().length > 500) { setError("Please enter a short reason."); return; }
    // Freeze the payload after a potentially ambiguous network failure.
    // Retrying the same UUID cannot create duplicate audit entries.
    request.current ??= { id: crypto.randomUUID(), leadId, sessionId, reason: reason.trim() };
    busy.current = true;
    setSaving(true); setError("");
    try {
      await recordLeadSkip(request.current);
      if (mounted.current) onSaved();
    } catch {
      setError("Couldn’t confirm the skip was saved. Retry to continue.");
    } finally { busy.current = false; setSaving(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy.current) onCancel(); }}>
    <DialogContent className="sm:max-w-[420px]">
      <DialogTitle>Skip this lead?</DialogTitle>
      <DialogDescription>{leadName || "This lead"} will stay in the leads list. Your reason, name and the time will be saved in Customer Journey.</DialogDescription>
      <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4">
        <label className="block text-sm font-medium">Reason
          <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} disabled={saving || Boolean(request.current)} maxLength={500}
            placeholder="Why are you skipping this lead?" className="mt-2 w-full rounded-md border p-3 text-sm" rows={3} />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onCancel} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving || reason.trim().length < 3} className="rounded-md bg-[#111] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : error && request.current ? "Retry save" : "Save and skip"}</button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

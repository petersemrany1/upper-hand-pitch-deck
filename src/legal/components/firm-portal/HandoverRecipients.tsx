// Ported from the Legal app (family-law-floater/src/components/firm-portal/HandoverRecipients.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getHandoverCcFn, saveHandoverCcFn } from "@/legal/lib/firm-portal.functions";
import { Button } from "@/legal/components/ui/button";
import { Textarea } from "@/legal/components/ui/textarea";

export function HandoverRecipients({ firmId }: { firmId: string }) {
  const load = useServerFn(getHandoverCcFn);
  const save = useServerFn(saveHandoverCcFn);
  const [cc, setCc] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError("");
    void load({ data: { firmId } }).then((addresses) => {
      if (cancelled) return;
      setCc(addresses.join("\n"));
      setLoaded(true);
    }).catch(() => { if (!cancelled) setError("Could not load the saved CC list."); });
    return () => { cancelled = true; };
  }, [firmId, load, retry]);

  const submit = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const addresses = await save({ data: { firmId, cc } });
      setCc(addresses.join("\n"));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the CC list.");
    } finally { setSaving(false); }
  };
  return <section className="mb-8 space-y-3 rounded-lg border p-4" aria-labelledby="handover-emails-title">
    <h3 id="handover-emails-title" className="text-sm font-semibold">Handover emails</h3>
    <p className="text-sm text-muted-foreground">The firm's main email remains the recipient. Add team members here to CC them on every client handover for this firm.</p>
    <label htmlFor="firm-handover-cc" className="block text-sm font-medium">Default CC recipients</label>
    <Textarea id="firm-handover-cc" value={cc} disabled={!loaded || saving}
      onChange={(e) => { setCc(e.target.value); setSaved(false); }}
      placeholder="One email per line, or separate with commas" rows={3} />
    <p className="text-xs text-muted-foreground">You can change the list for an individual email before sending. Leave this blank and save to remove all default CC recipients.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="text-sm text-green-700">CC recipients saved.</p>}
    {!loaded && error
      ? <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Retry</Button>
      : <Button onClick={() => void submit()} disabled={!loaded || saving}>{saving ? "Saving…" : "Save CC recipients"}</Button>}
  </section>;
}

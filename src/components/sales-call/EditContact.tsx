import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveLeadContact, type LeadContact } from "@/utils/lead-contact.functions";
import { invalidateLeadPhoneCache } from "@/utils/lead-phone-cache";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditContact({ leadId, onSaved, disabled = false }: {
  leadId: string; onSaved: (contact: LeadContact) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expected, setExpected] = useState<LeadContact | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  async function start() {
    setBusy(true); setError(""); setExpected(null); setOpen(true);
    try {
      const { data, error } = await supabase.from("meta_leads")
        .select("id,first_name,last_name,phone").eq("id", leadId).single();
      if (error) throw error;
      setExpected(data); setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? ""); setPhone(data.phone ?? "");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load contact details"); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!expected || busy || saving.current) return;
    saving.current = true;
    setBusy(true); setError("");
    try {
      const saved = await saveLeadContact({ data: { leadId: expected.id, firstName, lastName, phone, expected } });
      invalidateLeadPhoneCache(); onSaved(saved); setOpen(false);
      toast.success("Contact details saved. No message sent.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save contact details"); }
    finally { saving.current = false; setBusy(false); }
  }
  return <>
    <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => void start()}>Edit contact</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="z-[1101] max-w-md" overlayClassName="z-[1100]" onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Edit contact</DialogTitle>
        <DialogDescription>Save the name and phone number for this contact, their active booking and future reminders. Saving sends no text or email.</DialogDescription>
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
          {expected ? <>
            <div className="space-y-1"><Label htmlFor={`first-${leadId}`}>First name</Label><Input id={`first-${leadId}`} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} disabled={busy} /></div>
            <div className="space-y-1"><Label htmlFor={`last-${leadId}`}>Last name</Label><Input id={`last-${leadId}`} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} disabled={busy} /></div>
            <div className="space-y-1"><Label htmlFor={`phone-${leadId}`}>Phone number</Label><Input id={`phone-${leadId}`} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} disabled={busy} /></div>
          </> : busy && <p>Loading contact…</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !expected || !firstName.trim()}>{busy && expected ? "Saving…" : "Save contact"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

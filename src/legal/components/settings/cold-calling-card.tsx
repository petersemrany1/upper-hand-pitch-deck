// Ported from the Legal app (family-law-floater/src/components/settings/cold-calling-card.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Headset } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/legal/components/ui/badge";
import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Input } from "@/legal/components/ui/input";
import { Label } from "@/legal/components/ui/label";
import { Textarea } from "@/legal/components/ui/textarea";
import { fetchColdCallingSettings } from "@/legal/lib/cold-calling/client";
import { saveColdCallingSettingsFn } from "@/legal/lib/cold-calling/cold-calling.functions";
import { missingComplianceFields, type ColdCallingSettings } from "@/legal/lib/cold-calling/settings";

/** Firm Cold Call Portal settings: the details callers must state, calling hours, booking link. Admin only. */
export function ColdCallingCard() {
  const queryClient = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["cold-calling-settings"],
    queryFn: fetchColdCallingSettings,
  });
  const [form, setForm] = useState<ColdCallingSettings | null>(null);
  useEffect(() => {
    if (settingsQ.data && !form) setForm(settingsQ.data);
  }, [settingsQ.data, form]);
  const saveFn = useServerFn(saveColdCallingSettingsFn);
  const saving = useMutation({
    mutationFn: (s: ColdCallingSettings) => saveFn({ data: s }),
    onSuccess: () => {
      toast.success("Cold calling settings saved");
      void queryClient.invalidateQueries({ queryKey: ["cold-calling-settings"] });
    },
    onError: (e: Error) => toast.error(e.message, { duration: 12000 }),
  });
  if (!form) return null;
  const missing = missingComplianceFields(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headset className="h-4 w-4" aria-hidden /> Firm Cold Call Portal
        </CardTitle>
        <CardDescription>
          Callers must state these details on every call, so they are required before the first
          call.{" "}
          {missing.length ? (
            <Badge variant="destructive">{missing.length} missing</Badge>
          ) : (
            <Badge>Complete</Badge>
          )}{" "}
          The outbound number is picked automatically from the Phone Numbers pool: one number per
          caller per day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cc-business">Business name</Label>
            <Input
              id="cc-business"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cc-callback">Callback number</Label>
            <Input
              id="cc-callback"
              value={form.callback_number}
              onChange={(e) => setForm({ ...form, callback_number: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cc-complaints">Complaints / contact number</Label>
            <Input
              id="cc-complaints"
              value={form.complaints_number}
              onChange={(e) => setForm({ ...form, complaints_number: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cc-contact">Contact email or website</Label>
            <Input
              id="cc-contact"
              value={form.contact_email_or_website}
              onChange={(e) => setForm({ ...form, contact_email_or_website: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cc-purpose">Purpose of the call (said at the start)</Label>
            <Textarea
              id="cc-purpose"
              rows={2}
              value={form.purpose_of_call}
              onChange={(e) => setForm({ ...form, purpose_of_call: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose each person's tabs in Staff &amp; appointment setters above.
        </p>
        <Button
          onClick={() => saving.mutate({ ...form, compliance_override: null, record_calls: true })}
          disabled={saving.isPending}
        >
          {saving.isPending ? "Saving…" : "Save cold calling settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BOLD_NOTIFY_EMAIL = "petersemrany1@gmail.com";

async function assertCanAccessClinic(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  clinicId: string,
) {
  const [{ data: adminData }, { data: clinicOk }] = await Promise.all([
    supabase.rpc("is_admin_user"),
    supabase.rpc("is_clinic_user_for", { _clinic_id: clinicId }),
  ]);
  if (adminData !== true && clinicOk !== true) {
    throw new Error("Forbidden: you do not have access to this clinic");
  }
}

export const requestBoldChase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      clinicId: string;
      appointmentId: string;
      quoteId?: string | null;
      patientName: string;
      patientPhone?: string | null;
      note?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin
      .from("clinicflow_chase_requests")
      .insert({
        clinic_id: data.clinicId,
        appointment_id: data.appointmentId,
        quote_id: data.quoteId ?? null,
        patient_name: data.patientName,
        note: data.note?.trim() || null,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create the chase request");

    // Email Bold. A failure here must never fail the request itself.
    try {
      const [{ data: clinic }, quoteRes] = await Promise.all([
        supabaseAdmin.from("partner_clinics").select("clinic_name").eq("id", data.clinicId).maybeSingle(),
        data.quoteId
          ? supabaseAdmin
              .from("clinicflow_quotes")
              .select("price, status")
              .eq("id", data.quoteId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const clinicName = (clinic?.clinic_name as string | undefined) ?? "Clinic";
      const quote = (quoteRes as { data: { price: number; status: string } | null }).data;

      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; color:#111; line-height:1.55;">
          <h2 style="color:#1a3a6b; margin-bottom:4px;">Chase request</h2>
          <p><strong>Clinic:</strong> ${clinicName}<br/>
          <strong>Patient:</strong> ${data.patientName}<br/>
          <strong>Phone:</strong> ${data.patientPhone ?? "Not on file"}</p>
          ${quote ? `<p><strong>Quote:</strong> $${Math.round(Number(quote.price)).toLocaleString()} · ${String(quote.status).replace(/_/g, " ")}</p>` : ""}
          ${data.note?.trim() ? `<p><strong>Clinic note:</strong><br/>${data.note.trim().replace(/\n/g, "<br/>")}</p>` : ""}
          <p>Open the clinic portal to see the pipeline.</p>
        </div>
      `;

      const RESEND_CONNECTION_KEY = process.env.RESEND_API_KEY ?? "";
      const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? "";
      if (RESEND_CONNECTION_KEY && LOVABLE_API_KEY) {
        const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_CONNECTION_KEY,
          },
          body: JSON.stringify({
            from: "Bold Patients <admin@bold-patients.com>",
            reply_to: "admin@bold-patients.com",
            to: [BOLD_NOTIFY_EMAIL],
            subject: `Chase request — ${data.patientName} (${clinicName})`,
            html,
          }),
        });
        if (!resp.ok) {
          console.error("requestBoldChase email failed", resp.status, await resp.text());
        }
      } else {
        console.error("requestBoldChase: email service not configured");
      }
    } catch (e) {
      console.error("requestBoldChase email error", e);
    }

    return { success: true as const, chaseId: created.id as string };
  });

export const markChaseDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { chaseId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    if (isAdmin !== true) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinicflow_chase_requests")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", data.chaseId);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

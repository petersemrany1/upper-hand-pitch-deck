import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  clinicId: z.string().uuid(),
});

export const sendPackRenewalEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Admin gate
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    const { data: me } = await supabaseAdmin
      .from("sales_reps")
      .select("role")
      .ilike("email", email ?? "")
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Forbidden");

    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from("partner_clinics")
      .select("id, clinic_name, email")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (clinicErr) throw new Error(clinicErr.message);
    if (!clinic) throw new Error("Clinic not found");

    const recipient = (clinic.email || "").trim();
    if (!recipient) throw new Error("No email on file for this clinic");

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const React = (await import("react")).default;
    const { render } = await import("@react-email/render");
    const { template } = await import("./email-templates/pack-renewal");

    const contactName: string | undefined = undefined;
    const clinicName = clinic.clinic_name || undefined;

    const html = await render(
      React.createElement(template.component, { clinicName, contactName }),
      { pretty: false }
    );
    const subject =
      typeof template.subject === "function"
        ? template.subject({ clinicName, contactName })
        : template.subject;

    const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Bold <admin@bold-patients.com>",
        reply_to: "admin@bold-patients.com",
        to: [recipient],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Send failed [${response.status}]: ${body}`);
    }
    const result = (await response.json()) as { id?: string };
    return { ok: true, recipient, id: result.id ?? null };
  });

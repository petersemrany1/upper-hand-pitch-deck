import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public, read-only treatment-plan data. Quote IDs are unguessable UUIDs and
// are intentionally shared with patients as the access link.
export const getPublicClinicflowQuote = createServerFn({ method: "GET" })
  .inputValidator((data: { quoteId: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.quoteId)) {
      throw new Error("Invalid quote link");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote, error } = await supabaseAdmin
      .from("clinicflow_quotes")
      .select("id, clinic_id, appointment_id, patient_name, diagnosis, norwood, grafts, graft_unit, price, deposit_amount, description, includes_text, date_option_1, date_option_2, valid_until, booked_date, status")
      .eq("id", data.quoteId)
      .maybeSingle();

    if (error) throw new Error("Could not load this treatment plan");
    if (!quote) return { quote: null };

    const [{ data: clinic }, { data: settings }, { data: appointment }] = await Promise.all([
      supabaseAdmin
        .from("partner_clinics")
        .select("clinic_name, phone, city, state")
        .eq("id", quote.clinic_id)
        .maybeSingle(),
      supabaseAdmin
        .from("clinicflow_clinic_settings")
        .select("logo_url, whatsapp_number, doctor_name, cooling_off_days")
        .eq("clinic_id", quote.clinic_id)
        .maybeSingle(),
      supabaseAdmin
        .from("clinic_appointments")
        .select("patient_phone, patient_email")
        .eq("id", quote.appointment_id)
        .maybeSingle(),
    ]);

    let logoUrl: string | null = null;
    if (settings?.logo_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("clinicflow-logos")
        .createSignedUrl(settings.logo_url as string, 60 * 60 * 24);
      logoUrl = signed?.signedUrl ?? null;
    }

    return {
      quote,
      clinic: clinic
        ? {
            name: clinic.clinic_name as string,
            phone: (clinic.phone as string | null) ?? null,
            city: [clinic.city, clinic.state].filter(Boolean).join(", ") || null,
          }
        : null,
      settings: {
        logoUrl,
        whatsappNumber: (settings?.whatsapp_number as string | null) ?? null,
        doctorName: (settings?.doctor_name as string | null) ?? null,
        coolingOffDays: Number(settings?.cooling_off_days ?? 7),
      },
      patient: {
        phone: (appointment?.patient_phone as string | null) ?? null,
        email: (appointment?.patient_email as string | null) ?? null,
      },
    };
  });

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

export const createClinicflowQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      clinicId: string;
      appointmentId: string;
      intakeId?: string | null;
      leadId?: string | null;
      patientName: string;
      diagnosis: string;
      norwood?: string | null;
      grafts?: number | null;
      graftUnit?: "grafts" | "hairs";
      price: number;
      depositAmount: number;
      description?: string | null;
      includesText?: string | null;
      dateOption1?: string | null;
      dateOption2?: string | null;
      validUntil: string; // yyyy-mm-dd
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin
      .from("clinicflow_quotes")
      .insert({
        clinic_id: data.clinicId,
        appointment_id: data.appointmentId,
        intake_id: data.intakeId ?? null,
        lead_id: data.leadId ?? null,
        patient_name: data.patientName,
        diagnosis: data.diagnosis,
        norwood: data.norwood ?? null,
        grafts: data.grafts ?? null,
        graft_unit: data.graftUnit ?? "grafts",
        price: data.price,
        deposit_amount: data.depositAmount,
        description: data.description ?? null,
        includes_text: data.includesText ?? null,
        date_option_1: data.dateOption1 ?? null,
        date_option_2: data.dateOption2 ?? null,
        valid_until: data.validUntil,
        status: "presented",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create quote");
    return { quoteId: created.id as string };
  });

export const bookClinicflowQuoteDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quoteId: string; bookedDate: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote } = await supabaseAdmin
      .from("clinicflow_quotes")
      .select("clinic_id")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (!quote) throw new Error("Quote not found");
    await assertCanAccessClinic(context.supabase, quote.clinic_id as string);

    const { error } = await supabaseAdmin
      .from("clinicflow_quotes")
      .update({ status: "booked", booked_date: data.bookedDate })
      .eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

export const recordClinicflowQuoteDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { quoteId: string; depositAmount: number; method?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote } = await supabaseAdmin
      .from("clinicflow_quotes")
      .select("clinic_id")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (!quote) throw new Error("Quote not found");
    await assertCanAccessClinic(context.supabase, quote.clinic_id as string);

    const { error } = await supabaseAdmin
      .from("clinicflow_quotes")
      .update({
        status: "deposit_recorded",
        deposit_amount: data.depositAmount,
        deposit_method: data.method ?? "manual",
        deposit_recorded_at: new Date().toISOString(),
      })
      .eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

// Send the quote content as a plain, clinic-branded email via the Resend gateway.
export const sendClinicflowQuoteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quoteId: string; to: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote } = await supabaseAdmin
      .from("clinicflow_quotes")
      .select("*")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (!quote) throw new Error("Quote not found");
    await assertCanAccessClinic(context.supabase, quote.clinic_id as string);

    const { data: clinic } = await supabaseAdmin
      .from("partner_clinics")
      .select("clinic_name")
      .eq("id", quote.clinic_id)
      .maybeSingle();
    const clinicName = (clinic?.clinic_name as string | undefined) ?? "Your clinic";

    const fmtDate = (d: string | null | undefined) =>
      d ? new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null;
    const fmt$ = (n: number | null | undefined) => (typeof n === "number" ? "$" + Math.round(n).toLocaleString() : "");

    const bookedLine = quote.booked_date
      ? `<p><strong>Your procedure date:</strong> ${fmtDate(quote.booked_date as string)}</p>`
      : "";
    const dateLines = !quote.booked_date && (quote.date_option_1 || quote.date_option_2)
      ? `<p><strong>Next available dates:</strong><br/>${[quote.date_option_1, quote.date_option_2].filter(Boolean).map((d) => fmtDate(d as string)).join("<br/>")}</p>`
      : "";

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 620px; margin: 0 auto; color: #111; line-height: 1.55;">
        <h2 style="color:#1a3a6b; margin-bottom: 4px;">${clinicName}</h2>
        <p>Hi ${(quote.patient_name as string).split(" ")[0] || "there"},</p>
        <p>Thank you for coming in today. Here's a summary of what we discussed:</p>
        <p><strong>Diagnosis:</strong> ${quote.diagnosis}<br/>
        <strong>Recommended plan:</strong> FUE hair transplant${quote.norwood ? ` · Norwood ${quote.norwood}` : ""}<br/>
        ${quote.grafts ? `<strong>${quote.graft_unit === "hairs" ? "Hairs" : "Grafts"}:</strong> ${quote.grafts}<br/>` : ""}
        <strong>Price:</strong> ${fmt$(quote.price as number)} AUD</p>
        ${quote.description ? `<p>${(quote.description as string).replace(/\n/g, "<br/>")}</p>` : ""}
        ${quote.includes_text ? `<p><strong>What's included</strong><br/>${(quote.includes_text as string).replace(/\n/g, "<br/>")}</p>` : ""}
        <p><strong>Ways people pay:</strong> in full · deposit + balance before procedure day · finance options available.</p>
        <p><strong>Quote valid until:</strong> ${fmtDate(quote.valid_until as string)}</p>
        ${bookedLine}
        ${dateLines}
        <p style="margin-top: 24px;">If you have any questions, just reply to this email.</p>
        <p>Kind regards,<br/>${clinicName}</p>
      </div>
    `;

    const RESEND_CONNECTION_KEY = process.env.RESEND_API_KEY ?? "";
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? "";
    if (!RESEND_CONNECTION_KEY || !LOVABLE_API_KEY) {
      return { success: false as const, error: "Email service not configured" };
    }

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
        to: [data.to],
        subject: `Your consult summary — ${clinicName}`,
        html,
      }),
    });
    const result = (await resp.json()) as { id?: string; message?: string };
    if (!resp.ok) {
      return { success: false as const, error: result.message ?? "Failed to send" };
    }
    return { success: true as const, id: result.id };
  });

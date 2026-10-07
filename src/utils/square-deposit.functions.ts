import { checkoutDoctorName } from "@/lib/checkout-doctor";
import { createServerFn } from "@tanstack/react-start";
import { DEPOSIT_AMOUNT_CENTS, isCompletedSquareDeposit } from "@/lib/square-deposit-validation";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export type DepositClinicInfo = {
  clinicName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  doctorName: string | null;
};

export type DepositStartResult =
  | {
      ok: true;
      leadId: string;
      amount: number;
      configured: boolean;
      alreadyPaid: boolean;
      clinic: DepositClinicInfo | null;
    }
  | { ok: false; error: string };

const NOT_FOUND = "We couldn't find your booking. Please contact your consultant.";

async function lookupLead(ref: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const byToken = await supabaseAdmin
    .from("meta_leads")
    .select("id, first_name, last_name, clinic_id, deposit_paid_at")
    .eq("deposit_token", ref)
    .maybeSingle();
  if (byToken.data) return byToken.data;

  const byId = await supabaseAdmin
    .from("meta_leads")
    .select("id, first_name, last_name, clinic_id, deposit_paid_at")
    .eq("id", ref)
    .maybeSingle();
  return byId.data ?? null;
}

/**
 * Resolves the clinic the patient is booked with so the payment page is
 * branded to that clinic (name, doctor, address) rather than to us.
 * A saved clinic or booking takes priority over a legacy payment-link hint.
 * Returns null if the clinic is unknown, so an unpaid checkout can stop safely.
 */
async function lookupClinic(leadId: string, savedClinicId: string | null, clinicHint?: string): Promise<DepositClinicInfo | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let bookingQuery = supabaseAdmin.from("clinic_appointments")
    .select("clinic_id, doctor_id, doctor_name").eq("lead_id", leadId).is("disqualified_at", null);
  if (savedClinicId) bookingQuery = bookingQuery.eq("clinic_id", savedClinicId);
  const { data: appointment, error: bookingError } = await bookingQuery
    .order("updated_at", { ascending: false }).order("created_at", { ascending: false })
    .limit(1).maybeSingle();
  if (bookingError) throw bookingError;
  const clinicId = savedClinicId ?? appointment?.clinic_id ?? clinicHint ?? null;
  if (!clinicId) return null;

  const { data: clinic } = await supabaseAdmin
    .from("partner_clinics")
    .select("clinic_name, address, city, state, phone")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) return null;

  const { data: doctors, error: doctorError } = await supabaseAdmin
    .from("partner_doctors")
    .select("id, name, title, is_active, conducts_consultations")
    .eq("clinic_id", clinicId);
  if (doctorError) throw doctorError;
  const doctorName = checkoutDoctorName(appointment, doctors ?? []);

  return {
    clinicName: clinic.clinic_name,
    address: clinic.address,
    city: clinic.city,
    state: clinic.state,
    phone: clinic.phone,
    doctorName,
  };
}

/**
 * Public on purpose — patients open the payment page from an SMS link and are
 * not logged in. Returns no patient identifying information; the reference is
 * validated as a UUID before it ever reaches the database.
 */
export const startDepositPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { ref: string; clinicId?: string }) => {
    if (!UUID_RE.test(data.ref)) throw new Error("Invalid reference");
    if (data.clinicId && !UUID_RE.test(data.clinicId)) throw new Error("Invalid clinic reference");
    return data;
  })
  .handler(async ({ data }): Promise<DepositStartResult> => {
    try {
      const lead = await lookupLead(data.ref);
      if (!lead) return { ok: false, error: NOT_FOUND };

      // The saved clinic is authoritative. A legacy URL hint must not replace
      // an existing clinic with another merchant's branding.
      const clinic = await lookupClinic(lead.id, lead.clinic_id, data.clinicId);
      if (!lead.deposit_paid_at && (!clinic?.clinicName || !clinic.address?.trim())) {
        return { ok: false, error: "Your clinic details need to be confirmed before payment. Please ask your consultant for an updated payment link." };
      }

      return {
        ok: true,
        leadId: lead.id,
        amount: DEPOSIT_AMOUNT_CENTS / 100,
        configured: Boolean(
          process.env["SQUARE_ACCESS_TOKEN"] &&
            process.env["SQUARE_LOCATION_ID"] &&
            process.env["SQUARE_APPLICATION_ID"],
        ),
        alreadyPaid: Boolean(lead.deposit_paid_at),
        clinic,
      };
    } catch {
      return { ok: false, error: NOT_FOUND };
    }
  });

export type SquarePayResult =
  | { ok: true; paymentId: string; amount: number }
  | { ok: false; error: string; retryable?: boolean };

async function idempotencyKey(leadId: string, sourceId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${leadId}:${sourceId}`),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `htg-${hex.slice(0, 40)}`;
}

/**
 * Takes the browser-tokenised card nonce and charges $75 AUD on Square.
 * The raw card number never reaches our server. The location id is always read
 * server-side, so a tampered client cannot redirect funds.
 */
export const paySquareDeposit = createServerFn({ method: "POST" })
  .inputValidator((data: { ref: string; sourceId: string; verificationToken?: string; clinicId?: string }) => {
    if (!UUID_RE.test(data.ref)) throw new Error("Invalid reference");
    if (!data.sourceId || data.sourceId.length > 512) throw new Error("Invalid card token");
    if (data.clinicId && !UUID_RE.test(data.clinicId)) throw new Error("Invalid clinic reference");
    return data;
  })
  .handler(async ({ data }): Promise<SquarePayResult> => {
    const lead = await lookupLead(data.ref);
    if (!lead) return { ok: false, error: NOT_FOUND };

    if (lead.deposit_paid_at) {
      return { ok: true, paymentId: "already-paid", amount: DEPOSIT_AMOUNT_CENTS / 100 };
    }

    const clinic = await lookupClinic(lead.id, lead.clinic_id, data.clinicId);
    if (!clinic?.clinicName || !clinic.address?.trim()) {
      return { ok: false, error: "Your clinic details need to be confirmed before payment. Please contact your consultant." };
    }

    const { createSquarePayment } = await import("@/lib/square.server");

    const patientName =
      [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() || "Patient";

    const result = await createSquarePayment({
      sourceId: data.sourceId,
      amountCents: DEPOSIT_AMOUNT_CENTS,
      idempotencyKey: await idempotencyKey(lead.id, data.sourceId),
      referenceId: lead.id,
      note: `Booking fee — ${patientName}`,
      ...(data.verificationToken ? { verificationToken: data.verificationToken } : {}),
    });

    if ("error" in result) return { ok: false, error: result.error, retryable: result.retryable };

    if (!isCompletedSquareDeposit(result.payment, lead.id)) {
      return {
        ok: false,
        retryable: true,
        error: "Your payment has not been confirmed yet. Please try again here to check its status, or contact your consultant.",
      };
    }

    // Credit immediately so the rep/patient sees it without waiting on the
    // webhook; the webhook replay is idempotent.
    try {
      const { fulfilSquareDeposit } = await import("@/utils/square-fulfilment.server");
      const { getRequest } = await import("@tanstack/react-start/server");
      const origin = new URL(getRequest().url).origin;
      await fulfilSquareDeposit(result.payment, origin);
    } catch (e) {
      console.warn("paySquareDeposit: inline fulfilment failed", e);
    }

    return {
      ok: true,
      paymentId: result.payment.id,
      amount: DEPOSIT_AMOUNT_CENTS / 100,
    };
  });

import { createServerFn } from "@tanstack/react-start";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DEPOSIT_AMOUNT_CENTS = 7500;

export type DepositStartResult =
  | { ok: true; leadId: string; amount: number; configured: boolean; alreadyPaid: boolean }
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
 * Public on purpose — patients open the payment page from an SMS link and are
 * not logged in. Returns no patient identifying information; the reference is
 * validated as a UUID before it ever reaches the database.
 */
export const startDepositPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { ref: string }) => {
    if (!UUID_RE.test(data.ref)) throw new Error("Invalid reference");
    return data;
  })
  .handler(async ({ data }): Promise<DepositStartResult> => {
    try {
      const lead = await lookupLead(data.ref);
      if (!lead) return { ok: false, error: NOT_FOUND };

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
      };
    } catch {
      return { ok: false, error: NOT_FOUND };
    }
  });

export type SquarePayResult =
  | { ok: true; paymentId: string; amount: number }
  | { ok: false; error: string };

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
  .inputValidator((data: { ref: string; sourceId: string; verificationToken?: string }) => {
    if (!UUID_RE.test(data.ref)) throw new Error("Invalid reference");
    if (!data.sourceId || data.sourceId.length > 512) throw new Error("Invalid card token");
    return data;
  })
  .handler(async ({ data }): Promise<SquarePayResult> => {
    const lead = await lookupLead(data.ref);
    if (!lead) return { ok: false, error: NOT_FOUND };

    if (lead.deposit_paid_at) {
      return { ok: true, paymentId: "already-paid", amount: DEPOSIT_AMOUNT_CENTS / 100 };
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

    if ("error" in result) return { ok: false, error: result.error };

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

import { authedServerFn } from "@/lib/authed-fn";
import { stripeRequest, toCents } from "@/services/stripe.server";
import { getClinicSummary } from "@/services/clinics.server";
import { getLeadClinicId, recordLeadDeposit } from "@/services/leads.server";
import { logError } from "./error-logger.functions";

// Creates a fresh Stripe Checkout Session for the given package + amount.
// The amount is the TOTAL inc GST in AUD dollars (e.g. 8000 for $8,000).
// Returns the hosted Checkout URL the client can be sent to.
export const createStripeCheckoutSession = authedServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      clinicName: string;
      contactName: string;
      email: string;
      packageName: string;
      totalIncGst: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const amountCents = toCents(data.totalIncGst);
    if (amountCents === null) {
      return {
        success: false as const,
        error: "Invalid amount — must be at least $0.50 AUD.",
      };
    }

    const productName = "Bold Patients — " + data.packageName;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", "https://bold-patients.com/thank-you");
    params.append("cancel_url", "https://bold-patients.com");
    if (data.email) params.append("customer_email", data.email);
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "aud");
    params.append("line_items[0][price_data][unit_amount]", String(amountCents));
    params.append("line_items[0][price_data][product_data][name]", productName);
    params.append("metadata[clinic_name]", data.clinicName);
    params.append("metadata[contact_name]", data.contactName);
    params.append("metadata[package_name]", data.packageName);
    params.append("metadata[total_inc_gst]", String(data.totalIncGst));

    const res = await stripeRequest("bold", "checkout/sessions", params, "createStripeCheckoutSession");
    if (!res.ok) return { success: false as const, error: res.error };

    if (!res.data.url) {
      await logError("createStripeCheckoutSession", "No URL returned by Stripe", {
        rawResponse: res.data,
      });
      return { success: false as const, error: "Stripe did not return a checkout URL." };
    }

    return { success: true as const, url: res.data.url, id: res.data.id as string };
  });

// Creates a Stripe Checkout Session against the Hair Transplant Group (HTG)
// Stripe account for patient consultation deposits ($75 refundable).
// Intentionally never falls back to STRIPE_SECRET_KEY — that key belongs to the
// separate Bold Patients account.
export const createHtgDepositSession = authedServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      firstName: string;
      lastName: string;
      email: string;
      amount: number;
      leadId?: string;
      clinicId?: string;
      doctorName?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const amountCents = toCents(data.amount);
    if (amountCents === null) {
      return {
        success: false as const,
        error: "Invalid amount — must be at least $0.50 AUD.",
      };
    }

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
    let productName = "Consultation Deposit";
    let productDescription: string | null =
      "Fully refundable — returned in full when you attend your consultation.";
    let resolvedClinicName: string | null = null;
    let resolvedDoctorName: string | null = null;

    try {
      // Prefer an explicitly supplied clinicId (e.g. from the booking form,
      // which may not yet be persisted onto meta_leads.clinic_id).
      let clinicId: string | null = data.clinicId?.trim() || null;
      if (!clinicId && data.leadId) {
        clinicId = await getLeadClinicId(data.leadId);
      }

      const summary = clinicId ? await getClinicSummary(clinicId) : null;
      const clinicName = summary?.clinicName ?? null;
      let doctor = data.doctorName?.trim() || summary?.doctorName || null;
      if (doctor && !/^dr\b/i.test(doctor)) doctor = `Dr ${doctor}`;
      resolvedClinicName = clinicName;
      resolvedDoctorName = doctor;

      // Short, scannable title — keeps the A$ amount visually dominant.
      if (doctor) productName = `Consultation with ${doctor}`;
      else if (clinicName) productName = `Consultation at ${clinicName}`;

      // Stripe Checkout renders product_data.description as plain text and
      // strips newlines, so we use separators and keep it short so it isn't
      // truncated with "..." on mobile.
      const parts: string[] = [];
      if (clinicName) parts.push(clinicName);
      if (summary?.addressLine) parts.push(summary.addressLine);
      parts.push("Fully refundable at your consultation");
      productDescription = parts.join("  |  ");
    } catch (err) {
      // Lookup failure must never block taking the deposit — fall back to generic name.
      console.error("createHtgDepositSession clinic lookup failed", err);
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", "https://hairtransplantgroup.lovable.app/thank-you");
    params.append("cancel_url", "https://hairtransplantgroup.lovable.app");
    if (data.email) params.append("customer_email", data.email);
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "aud");
    params.append("line_items[0][price_data][unit_amount]", String(amountCents));
    params.append("line_items[0][price_data][product_data][name]", productName);
    if (productDescription) {
      params.append("line_items[0][price_data][product_data][description]", productDescription);
    }
    params.append("payment_intent_data[statement_descriptor_suffix]", "HTG DEPOSIT");
    if (data.leadId) params.append("payment_intent_data[metadata][lead_id]", data.leadId);
    params.append("payment_intent_data[metadata][deposit_amount]", String(data.amount));
    params.append("payment_intent_data[metadata][source]", "htg_deposit_checkout");
    params.append("metadata[patient_name]", fullName);
    if (data.leadId) params.append("metadata[lead_id]", data.leadId);
    params.append("metadata[deposit_amount]", String(data.amount));
    if (resolvedClinicName) params.append("metadata[clinic_name]", resolvedClinicName);
    if (resolvedDoctorName) params.append("metadata[doctor_name]", resolvedDoctorName);

    const res = await stripeRequest("htg", "checkout/sessions", params, "createHtgDepositSession");
    if (!res.ok) return { success: false as const, error: res.error };

    if (!res.data.url) {
      await logError("createHtgDepositSession", "No URL returned by Stripe", {
        rawResponse: res.data,
      });
      return { success: false as const, error: "Stripe did not return a checkout URL." };
    }

    return { success: true as const, url: res.data.url, id: res.data.id as string };
  });

// Returns the HTG Stripe publishable key for client-side Stripe.js initialisation.
// Publishable keys are safe to expose to the browser.
export const getHtgStripePublishableKey = authedServerFn({ method: "GET" })
  .handler(async () => {
    const key = process.env.STRIPE_HTG_PUBLISHABLE_KEY || "";
    return { publishableKey: key };
  });

// Charges a card directly using a Stripe PaymentMethod ID created on the client
// via Stripe Elements. The raw card details never touch the server.
export const chargeCardOverPhone = authedServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      paymentMethodId: string;
      amountCents: number;
      patientName: string;
      leadId?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    if (!Number.isFinite(data.amountCents) || data.amountCents < 50) {
      return { success: false as const, error: "Invalid amount — must be at least $0.50 AUD." };
    }
    if (!data.paymentMethodId) {
      return { success: false as const, error: "Missing payment method." };
    }

    const params = new URLSearchParams();
    params.append("amount", String(Math.round(data.amountCents)));
    params.append("currency", "aud");
    params.append("payment_method", data.paymentMethodId);
    params.append("confirm", "true");
    params.append("description", `Deposit — ${data.patientName}`);
    params.append("statement_descriptor_suffix", "HTG DEPOSIT");
    params.append("payment_method_types[]", "card");
    params.append("metadata[patient_name]", data.patientName);
    if (data.leadId) params.append("metadata[lead_id]", data.leadId);
    params.append("metadata[source]", "charge_card_over_phone");

    const res = await stripeRequest("htg", "payment_intents", params, "chargeCardOverPhone");
    if (!res.ok) return { success: false as const, error: res.error };
    const result = res.data;

    if (result.status !== "succeeded") {
      const errMsg =
        `Payment ${result.status}` +
        (result.last_payment_error?.message ? `: ${result.last_payment_error.message}` : "");
      return { success: false as const, error: errMsg };
    }

    if (data.leadId && result.id) {
      // Credit meta_leads so the booking UI stops showing "payment pending".
      // Mirrors the stripe-deposit webhook (which only fires for hosted
      // Checkout sessions, not for direct over-phone PaymentIntents).
      // IMPORTANT: never touch meta_leads.status — rep still confirms booking.
      await recordLeadDeposit({
        leadId: data.leadId,
        paymentIntentId: result.id,
        amountDollars: (result.amount ?? data.amountCents) / 100,
      });
    }

    return {
      success: true as const,
      paymentIntentId: result.id as string,
      amountCents: result.amount as number,
    };
  });

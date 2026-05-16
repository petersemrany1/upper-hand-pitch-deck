import { createServerFn } from "@tanstack/react-start";
import { logError } from "./error-logger.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type StripeApiResponse = {
  id?: string;
  url?: string;
  amount?: number;
  status?: string;
  error?: { message?: string };
  last_payment_error?: { message?: string };
};

// Creates a fresh Stripe Checkout Session for the given package + amount.
// The amount is the TOTAL inc GST in AUD dollars (e.g. 8000 for $8,000).
// Returns the hosted Checkout URL the client can be sent to.
export const createStripeCheckoutSession = createServerFn({ method: "POST" })
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
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      const msg = "STRIPE_SECRET_KEY is not configured";
      await logError("createStripeCheckoutSession", msg, {
        email: data.email,
        clinicName: data.clinicName,
        packageName: data.packageName,
      });
      return { success: false as const, error: msg };
    }

    const amountCents = Math.round(Number(data.totalIncGst) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      return {
        success: false as const,
        error: "Invalid amount — must be at least $0.50 AUD.",
      };
    }

    const productName = "Bold Patients — " + data.packageName;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", "https://hairtransplantgroup.lovable.app/thank-you");
    params.append("cancel_url", "https://hairtransplantgroup.lovable.app");
    if (data.email) params.append("customer_email", data.email);
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "aud");
    params.append("line_items[0][price_data][unit_amount]", String(amountCents));
    params.append("line_items[0][price_data][product_data][name]", productName);
    params.append("metadata[clinic_name]", data.clinicName);
    params.append("metadata[contact_name]", data.contactName);
    params.append("metadata[package_name]", data.packageName);
    params.append("metadata[total_inc_gst]", String(data.totalIncGst));

    try {
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + stripeKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const result = (await response.json()) as StripeApiResponse;

      if (!response.ok) {
        const errMsg =
          (result && result.error && (result.error.message as string)) ||
          "Stripe API error";
        console.error("Stripe error:", JSON.stringify(result));
        await logError("createStripeCheckoutSession", errMsg, {
          email: data.email,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: result,
        });
        return { success: false as const, error: errMsg };
      }

      if (!result.url) {
        await logError("createStripeCheckoutSession", "No URL returned by Stripe", {
          email: data.email,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: result,
        });
        return { success: false as const, error: "Stripe did not return a checkout URL." };
      }

      return { success: true as const, url: result.url as string, id: result.id as string };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Stripe request failed:", err);
      await logError("createStripeCheckoutSession", errMsg, {
        email: data.email,
        clinicName: data.clinicName,
        packageName: data.packageName,
      });
      return { success: false as const, error: "Request failed" };
    }
  });

// Creates a Stripe Checkout Session against the Hair Transplant Group (HTG)
// Stripe account for patient consultation deposits ($75 refundable).
// Intentionally never falls back to STRIPE_SECRET_KEY — that key belongs to the
// separate Bold Patients account.
export const createHtgDepositSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      firstName: string;
      lastName: string;
      email: string;
      amount: number;
      leadId?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_HTG_SECRET_KEY;
    if (!stripeKey) {
      const msg = "STRIPE_HTG_SECRET_KEY is not configured";
      await logError("createHtgDepositSession", msg, {
        email: data.email,
        leadId: data.leadId,
      });
      return { success: false as const, error: msg };
    }

    const validPrefix =
      stripeKey.startsWith("sk_live_") ||
      stripeKey.startsWith("sk_test_") ||
      stripeKey.startsWith("rk_live_");
    if (!validPrefix) {
      await logError(
        "createHtgDepositSession",
        `Invalid Stripe key format: starts with "${stripeKey.slice(0, 8)}"`,
        { email: data.email, leadId: data.leadId },
      );
      return { success: false as const, error: "Stripe key is misconfigured — contact admin" };
    }

    const amountCents = Math.round(Number(data.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      return {
        success: false as const,
        error: "Invalid amount — must be at least $0.50 AUD.",
      };
    }

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
    const productName = "Hair Transplant Consultation Deposit (Refundable)";

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", "https://bold-patients.com/thank-you");
    params.append("cancel_url", "https://bold-patients.com");
    if (data.email) params.append("customer_email", data.email);
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "aud");
    params.append("line_items[0][price_data][unit_amount]", String(amountCents));
    params.append("line_items[0][price_data][product_data][name]", productName);
    params.append("payment_intent_data[statement_descriptor_suffix]", "HTG DEPOSIT");
    if (data.leadId) params.append("payment_intent_data[metadata][lead_id]", data.leadId);
    params.append("payment_intent_data[metadata][deposit_amount]", String(data.amount));
    params.append("payment_intent_data[metadata][source]", "htg_deposit_checkout");
    params.append("metadata[patient_name]", fullName);
    if (data.leadId) params.append("metadata[lead_id]", data.leadId);
    params.append("metadata[deposit_amount]", String(data.amount));

    try {
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + stripeKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const result = (await response.json()) as StripeApiResponse;

      if (!response.ok) {
        const errMsg =
          (result && result.error && (result.error.message as string)) ||
          "Stripe API error";
        console.error("Stripe HTG error:", JSON.stringify(result));
        await logError("createHtgDepositSession", errMsg, {
          email: data.email,
          leadId: data.leadId,
          rawResponse: result,
        });
        return { success: false as const, error: errMsg };
      }

      if (!result.url) {
        await logError("createHtgDepositSession", "No URL returned by Stripe", {
          email: data.email,
          leadId: data.leadId,
          rawResponse: result,
        });
        return { success: false as const, error: "Stripe did not return a checkout URL." };
      }

      return { success: true as const, url: result.url as string, id: result.id as string };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Stripe HTG request failed:", err);
      await logError("createHtgDepositSession", errMsg, {
        email: data.email,
        leadId: data.leadId,
      });
      return { success: false as const, error: "Request failed" };
    }
  });

// Returns the HTG Stripe publishable key for client-side Stripe.js initialisation.
// Publishable keys are safe to expose to the browser.
export const getHtgStripePublishableKey = createServerFn({ method: "GET" })
  .handler(async () => {
    const key = process.env.STRIPE_HTG_PUBLISHABLE_KEY || "";
    return { publishableKey: key };
  });

// Charges a card directly using a Stripe PaymentMethod ID created on the client
// via Stripe Elements. The raw card details never touch the server.
export const chargeCardOverPhone = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      paymentMethodId: string;
      amountCents: number;
      patientName: string;
      leadId?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_HTG_SECRET_KEY;
    if (!stripeKey) {
      const msg = "STRIPE_HTG_SECRET_KEY is not configured";
      await logError("chargeCardOverPhone", msg, { leadId: data.leadId, patientName: data.patientName });
      return { success: false as const, error: msg };
    }

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

    try {
      const response = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + stripeKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const result = (await response.json()) as StripeApiResponse;

      if (!response.ok) {
        const errMsg = (result && result.error && (result.error.message as string)) || "Stripe API error";
        console.error("Stripe charge error:", JSON.stringify(result));
        await logError("chargeCardOverPhone", errMsg, {
          leadId: data.leadId, patientName: data.patientName, rawResponse: result,
        });
        return { success: false as const, error: errMsg };
      }

      if (result.status !== "succeeded") {
        const errMsg = `Payment ${result.status}` + (result.last_payment_error?.message ? `: ${result.last_payment_error.message}` : "");
        return { success: false as const, error: errMsg };
      }

      if (data.leadId && result.id) {
        await supabaseAdmin
          .from("clinic_appointments")
          .update({
            stripe_payment_intent_id: result.id,
            deposit_amount: (result.amount ?? data.amountCents) / 100,
            refund_status: null,
            refund_processed_at: null,
            stripe_refund_id: null,
          })
          .eq("lead_id", data.leadId);
      }

      return {
        success: true as const,
        paymentIntentId: result.id as string,
        amountCents: result.amount as number,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Stripe charge request failed:", err);
      await logError("chargeCardOverPhone", errMsg, { leadId: data.leadId, patientName: data.patientName });
      return { success: false as const, error: "Request failed" };
    }
  });

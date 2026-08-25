import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

// Compatibility wrapper for older callers. Never creates a session against the
// retired HTG Stripe account; patients are always sent to the managed checkout.
export const createHtgDepositSession = createServerFn({ method: "POST" })
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
    if (!data.leadId) {
      return { success: false as const, error: "A lead is required to create a deposit link." };
    }
    return {
      success: true as const,
      url: `https://hairtransplantgroup.lovable.app/pay-deposit?lead=${encodeURIComponent(data.leadId)}`,
      id: `managed_${data.leadId}`,
    };
  });

// Returns the publishable key for client-side Stripe.js initialisation, plus
// which account it belongs to. The retired HTG account is deliberately never
// returned, preventing new PaymentMethods from being created against it.
export const getHtgStripePublishableKey = createServerFn({ method: "GET" })
  .handler(async () => {
    const managed = process.env.VITE_PAYMENTS_CLIENT_TOKEN || "";
    return { publishableKey: managed, account: "managed" as const };
  });

// Charges a card directly using a Stripe PaymentMethod ID created on the client
// via Stripe Elements. The raw card details never touch the server.
export const chargeCardOverPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      paymentMethodId: string;
      amountCents: number;
      patientName: string;
      leadId?: string;
      // Which Stripe account the client-side PaymentMethod was created on.
      // A PaymentMethod can only be charged by the account that minted it.
      account?: "managed";
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

    try {
      const { getConnectionApiKey, resolveStripeEnv } = await import("@/lib/stripe.server");
      const connectionApiKey = getConnectionApiKey(resolveStripeEnv());
      const response = await fetch(
        "https://connector-gateway.lovable.dev/stripe/v1/payment_intents",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Connection-Api-Key": connectionApiKey,
            "Lovable-API-Key": process.env.LOVABLE_API_KEY || "",
          },
          body: params.toString(),
        },
      );

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
        const amountDollars = (result.amount ?? data.amountCents) / 100;

        // Credit meta_leads so the booking UI stops showing "payment pending".
        // Mirrors the stripe-deposit webhook (which only fires for hosted
        // Checkout sessions, not for direct over-phone PaymentIntents).
        // IMPORTANT: never touch meta_leads.status — rep still confirms booking.
        // See mem://rules/lead-status-no-auto-change.
        await supabaseAdmin
          .from("meta_leads")
          .update({
            deposit_paid_at: new Date().toISOString(),
            deposit_amount: amountDollars,
            stripe_payment_intent_id: result.id,
          })
          .eq("id", data.leadId);

        // If an appointment row already exists, backfill its payment fields too.
        await supabaseAdmin
          .from("clinic_appointments")
          .update({
            stripe_payment_intent_id: result.id,
            deposit_amount: amountDollars,
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

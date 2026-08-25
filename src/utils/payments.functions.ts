import { createServerFn } from "@tanstack/react-start";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

export type DepositCheckoutResult =
  | { clientSecret: string; patientName: string | null; amount: number }
  | { error: string };

/**
 * Creates an embedded Checkout session for the $75 refundable consultation
 * booking fee. Public on purpose — patients open it from an SMS link and are
 * not logged in. The only input is the lead id; everything else (name, clinic,
 * doctor) is resolved server-side so nothing can be tampered with.
 */
export const createDepositCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    leadId: string;
    returnUrl: string;
    environment: StripeEnv;
    assisted?: boolean;
  }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.leadId)) throw new Error("Invalid leadId");
    return data;
  })
  .handler(async ({ data }): Promise<DepositCheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: lead } = await supabaseAdmin
        .from("meta_leads")
        .select("id, first_name, last_name, email, clinic_id")
        .eq("id", data.leadId)
        .maybeSingle();

      if (!lead) return { error: "We couldn't find your booking. Please contact your consultant." };

      const patientName =
        [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() || null;

      let clinicName: string | null = null;
      let doctorName: string | null = null;
      if (lead.clinic_id) {
        const { data: clinicRow } = await supabaseAdmin
          .from("clinics")
          .select("clinic_name, doctor_name")
          .eq("id", lead.clinic_id)
          .maybeSingle();
        if (clinicRow) {
          clinicName = clinicRow.clinic_name?.trim() || null;
          doctorName = clinicRow.doctor_name?.trim() || null;
        } else {
          const { data: partnerRow } = await supabaseAdmin
            .from("partner_clinics")
            .select("clinic_name")
            .eq("id", lead.clinic_id)
            .maybeSingle();
          clinicName = partnerRow?.clinic_name?.trim() || null;
        }
      }
      if (doctorName && !/^dr\b/i.test(doctorName)) doctorName = `Dr ${doctorName}`;

      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: ["patient_booking_fee_75"] });
      if (!prices.data.length) return { error: "Booking fee price not found" };
      const stripePrice = prices.data[0];

      const productId =
        typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      // Staff-assisted phone payments: pre-create the Customer with the details
      // we already hold so Checkout does not ask the rep for name or email.
      let assistedCustomerId: string | undefined;
      if (data.assisted) {
        const existing = lead.email
          ? await stripe.customers.list({ email: lead.email, limit: 1 })
          : { data: [] as { id: string }[] };
        assistedCustomerId = existing.data.length
          ? existing.data[0].id
          : (
              await stripe.customers.create({
                ...(lead.email ? { email: lead.email } : {}),
                ...(patientName ? { name: patientName } : {}),
                metadata: { lead_id: lead.id },
              })
            ).id;
      }

      const descriptionParts = [
        doctorName ? `Consultation with ${doctorName}` : null,
        clinicName,
        "Fully refunded when you attend",
      ].filter(Boolean);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        // Staff-assisted phone payments must always present blank card fields.
        // Do not bind the patient's email to Link or offer saved Link wallets.
        ...(data.assisted
          ? {
              payment_method_types: ["card"] as ["card"],
              wallet_options: { link: { display: "never" as const } },
            }
          : lead.email
            ? { customer_email: lead.email }
            : {}),
        automatic_tax: { enabled: true },
        payment_intent_data: {
          description: `${product.name}${patientName ? ` — ${patientName}` : ""}`,
          statement_descriptor_suffix: "HTG DEPOSIT",
          metadata: {
            lead_id: lead.id,
            source: "htg_deposit_embedded",
            deposit_amount: "75",
          },
        },
        metadata: {
          lead_id: lead.id,
          deposit_amount: "75",
          managed_payments: "false",
          ...(patientName ? { patient_name: patientName } : {}),
          ...(clinicName ? { clinic_name: clinicName } : {}),
          ...(doctorName ? { doctor_name: doctorName } : {}),
        },
      });

      return {
        clientSecret: session.client_secret ?? "",
        patientName,
        amount: (stripePrice.unit_amount ?? 7500) / 100,
        // Kept for UI copy only.
        ...(descriptionParts.length ? {} : {}),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

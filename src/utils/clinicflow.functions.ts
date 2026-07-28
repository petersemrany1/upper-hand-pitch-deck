import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Base URL for Stripe Connect redirects. Must be a fixed public URL.
const RETURN_BASE = "https://hairtransplantgroup.lovable.app/clinic-portal?clinicflow=stripe-return";
const REFRESH_BASE = "https://hairtransplantgroup.lovable.app/clinic-portal?clinicflow=stripe-refresh";

type StripeAccountResponse = {
  id?: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  error?: { message?: string };
};

type StripeAccountLinkResponse = {
  url?: string;
  error?: { message?: string };
};

async function assertCanAccessClinic(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  clinicId: string,
): Promise<{ isAdmin: boolean }> {
  const [{ data: adminData }, { data: clinicOk }] = await Promise.all([
    supabase.rpc("is_admin_user"),
    supabase.rpc("is_clinic_user_for", { _clinic_id: clinicId }),
  ]);
  const isAdmin = adminData === true;
  const isClinicUser = clinicOk === true;
  if (!isAdmin && !isClinicUser) {
    throw new Error("Forbidden: you do not have access to this clinic");
  }
  return { isAdmin };
}

// Fetch (and lazily create) the ClinicFlow settings row for a clinic.
export const getClinicflowSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .select("*")
      .eq("clinic_id", data.clinicId)
      .maybeSingle();
    if (existing) return { settings: existing };

    const { data: created, error } = await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .insert({ clinic_id: data.clinicId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { settings: created };
  });

// Update clinic-editable fields only (logo_url, whatsapp_number, deposit, validity).
export const updateClinicflowSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      clinicId: string;
      logoUrl?: string | null;
      whatsappNumber?: string | null;
      defaultDepositAmount?: number;
      quoteValidityDays?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);

    const patch: Record<string, unknown> = {};
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
    if (data.whatsappNumber !== undefined) patch.whatsapp_number = data.whatsappNumber;
    if (data.defaultDepositAmount !== undefined) patch.default_deposit_amount = data.defaultDepositAmount;
    if (data.quoteValidityDays !== undefined) patch.quote_validity_days = data.quoteValidityDays;
    if (Object.keys(patch).length === 0) return { success: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure row exists first
    await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .upsert({ clinic_id: data.clinicId, ...patch }, { onConflict: "clinic_id" });
    return { success: true as const };
  });

// Kick off Stripe Express Connect onboarding for a clinic. Returns a hosted URL.
export const clinicflowConnectOnboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { success: false as const, error: "STRIPE_SECRET_KEY not configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load/create settings row.
    let stripeAccountId: string | null = null;
    {
      const { data: row } = await supabaseAdmin
        .from("clinicflow_clinic_settings")
        .select("stripe_account_id")
        .eq("clinic_id", data.clinicId)
        .maybeSingle();
      stripeAccountId = (row?.stripe_account_id as string | null) ?? null;
      if (!row) {
        await supabaseAdmin
          .from("clinicflow_clinic_settings")
          .insert({ clinic_id: data.clinicId });
      }
    }

    // Create an Express account if we don't have one yet.
    if (!stripeAccountId) {
      const params = new URLSearchParams();
      params.append("type", "express");
      params.append("country", "AU");
      params.append("business_type", "company");
      params.append("capabilities[card_payments][requested]", "true");
      params.append("capabilities[transfers][requested]", "true");
      params.append("metadata[clinic_id]", data.clinicId);

      const resp = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const acct = (await resp.json()) as StripeAccountResponse;
      if (!resp.ok || !acct.id) {
        return { success: false as const, error: acct.error?.message ?? "Stripe account creation failed" };
      }
      stripeAccountId = acct.id;

      // Only service role can write stripe fields (trigger blocks other writers).
      await supabaseAdmin
        .from("clinicflow_clinic_settings")
        .update({ stripe_account_id: stripeAccountId })
        .eq("clinic_id", data.clinicId);
    }

    // Create an Account Link for onboarding.
    const linkParams = new URLSearchParams();
    linkParams.append("account", stripeAccountId);
    linkParams.append("type", "account_onboarding");
    linkParams.append("return_url", RETURN_BASE);
    linkParams.append("refresh_url", REFRESH_BASE);
    const linkResp = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: linkParams.toString(),
    });
    const link = (await linkResp.json()) as StripeAccountLinkResponse;
    if (!linkResp.ok || !link.url) {
      return { success: false as const, error: link.error?.message ?? "Stripe account link failed" };
    }
    return { success: true as const, url: link.url };
  });

// Poll Stripe for account status and mirror into the settings row.
export const clinicflowConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { success: false as const, error: "STRIPE_SECRET_KEY not configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .select("stripe_account_id, stripe_details_submitted, stripe_charges_enabled")
      .eq("clinic_id", data.clinicId)
      .maybeSingle();
    if (!row?.stripe_account_id) {
      return {
        success: true as const,
        detailsSubmitted: false,
        chargesEnabled: false,
      };
    }

    const resp = await fetch(`https://api.stripe.com/v1/accounts/${row.stripe_account_id}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const acct = (await resp.json()) as StripeAccountResponse;
    if (!resp.ok) {
      return { success: false as const, error: acct.error?.message ?? "Stripe status fetch failed" };
    }
    const detailsSubmitted = acct.details_submitted === true;
    const chargesEnabled = acct.charges_enabled === true;

    await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .update({
        stripe_details_submitted: detailsSubmitted,
        stripe_charges_enabled: chargesEnabled,
      })
      .eq("clinic_id", data.clinicId);

    return { success: true as const, detailsSubmitted, chargesEnabled };
  });

// Admin-only: create a full ClinicFlow test clinic and wire the current admin
// into it as a clinic_portal_user so they can experience the clinic side.
export const clinicflowCreateTestClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    if (isAdmin !== true) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adminUserId = context.userId;

    // Create the partner clinic.
    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from("partner_clinics")
      .insert({
        clinic_name: "ClinicFlow Test Clinic",
        is_active: false,
        consult_price_original: 395,
        consult_price_deposit: 75,
        price_per_booking: 0,
        min_appointment_gap_mins: 0,
      })
      .select("id, clinic_name")
      .single();
    if (clinicErr || !clinic) throw new Error(clinicErr?.message ?? "Failed to create clinic");

    // Create settings row.
    await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .insert({ clinic_id: clinic.id });

    // Link the current admin's auth user to this clinic so they can log in as a
    // clinic user for testing. This is safe: clinic_portal_users.id references
    // auth.users(id) 1:1, so upsert on primary key.
    const email = context.claims.email ?? "admin@bold-patients.com";
    await supabaseAdmin
      .from("clinic_portal_users")
      .upsert(
        { id: adminUserId, clinic_id: clinic.id, email: String(email) },
        { onConflict: "id" },
      );

    return { success: true as const, clinicId: clinic.id, clinicName: clinic.clinic_name };
  });

// Admin overview: list ClinicFlow status for every partner clinic.
export const listClinicflowStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    if (isAdmin !== true) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .select("clinic_id, stripe_account_id, stripe_details_submitted, stripe_charges_enabled");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

// Create a signed URL for a private logo path so the client can render it.
export const clinicflowSignLogoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string; path: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("clinicflow-logos")
      .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

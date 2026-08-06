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
      kioskPin?: string;
      follicleModelUrl?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);

    const patch: Record<string, unknown> = {};
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
    if (data.whatsappNumber !== undefined) patch.whatsapp_number = data.whatsappNumber;
    if (data.defaultDepositAmount !== undefined) patch.default_deposit_amount = data.defaultDepositAmount;
    if (data.quoteValidityDays !== undefined) patch.quote_validity_days = data.quoteValidityDays;
    if (data.follicleModelUrl !== undefined) patch.follicle_model_url = data.follicleModelUrl;
    if (data.kioskPin !== undefined) {
      const pin = String(data.kioskPin).trim();
      if (!/^\d{4,8}$/.test(pin)) throw new Error("Kiosk PIN must be 4-8 digits");
      patch.kiosk_pin = pin;
    }
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
    const { logError } = await import("@/utils/error-logger.functions");
    try {
      await assertCanAccessClinic(context.supabase, data.clinicId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logError("clinicflowConnectOnboard", `Access denied: ${msg}`, { clinicId: data.clinicId });
      return { success: false as const, error: msg };
    }
    const stripeKey = process.env.CLINICFLOW_STRIPE_SECRET_KEY;
    if (!stripeKey) {
      const msg =
        "ClinicFlow Stripe not configured (CLINICFLOW_STRIPE_SECRET_KEY missing). Add it in Project Settings → Secrets, then republish.";
      await logError("clinicflowConnectOnboard", msg, { clinicId: data.clinicId });
      return { success: false as const, error: msg };
    }

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
        const stripeMsg = acct.error?.message ?? `Stripe account creation failed (HTTP ${resp.status})`;
        await logError("clinicflowConnectOnboard", `Stripe /accounts error: ${stripeMsg}`, {
          clinicId: data.clinicId,
          status: resp.status,
          stripeError: acct.error ?? null,
        });
        return { success: false as const, error: stripeMsg };
      }
      stripeAccountId = acct.id;

      // Only service role can write stripe fields (trigger blocks other writers).
      const { error: updErr } = await supabaseAdmin
        .from("clinicflow_clinic_settings")
        .update({ stripe_account_id: stripeAccountId })
        .eq("clinic_id", data.clinicId);
      if (updErr) {
        await logError("clinicflowConnectOnboard", `Failed to save stripe_account_id: ${updErr.message}`, {
          clinicId: data.clinicId,
          stripeAccountId,
        });
        return { success: false as const, error: `Saved Stripe account but could not persist ID: ${updErr.message}` };
      }
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
      const stripeMsg = link.error?.message ?? `Stripe account link failed (HTTP ${linkResp.status})`;
      await logError("clinicflowConnectOnboard", `Stripe /account_links error: ${stripeMsg}`, {
        clinicId: data.clinicId,
        status: linkResp.status,
        stripeError: link.error ?? null,
        stripeAccountId,
      });
      return { success: false as const, error: stripeMsg };
    }
    return { success: true as const, url: link.url };
  });

// Poll Stripe for account status and mirror into the settings row.
export const clinicflowConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const stripeKey = process.env.CLINICFLOW_STRIPE_SECRET_KEY;
    if (!stripeKey) return { success: false as const, error: "CLINICFLOW_STRIPE_SECRET_KEY not configured" };

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
    const TEST_NAME = "ClinicFlow Test Clinic";

    // Idempotency: if this admin is already linked to a test clinic, return it.
    const { data: existingLink } = await supabaseAdmin
      .from("clinic_portal_users")
      .select("clinic_id")
      .eq("id", adminUserId)
      .maybeSingle();

    if (existingLink?.clinic_id) {
      const { data: existingClinic } = await supabaseAdmin
        .from("partner_clinics")
        .select("id, clinic_name")
        .eq("id", existingLink.clinic_id)
        .eq("clinic_name", TEST_NAME)
        .maybeSingle();
      if (existingClinic) {
        return {
          success: true as const,
          alreadyExisted: true as const,
          clinicId: existingClinic.id,
          clinicName: existingClinic.clinic_name,
        };
      }
    }

    // Reuse any existing test clinic (avoid creating another partner row).
    const { data: reusable } = await supabaseAdmin
      .from("partner_clinics")
      .select("id, clinic_name")
      .eq("clinic_name", TEST_NAME)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let clinicId: string;
    let clinicName: string;
    let alreadyExisted = false;

    if (reusable) {
      clinicId = reusable.id;
      clinicName = reusable.clinic_name;
      alreadyExisted = true;
      // Ensure it's active so the admin can see it on the Partner Clinics list.
      await supabaseAdmin
        .from("partner_clinics")
        .update({ is_active: true })
        .eq("id", clinicId);
    } else {
      const { data: clinic, error: clinicErr } = await supabaseAdmin
        .from("partner_clinics")
        .insert({
          clinic_name: TEST_NAME,
          is_active: true,
          consult_price_original: 395,
          consult_price_deposit: 75,
          price_per_booking: 0,
          min_appointment_gap_mins: 0,
        })
        .select("id, clinic_name")
        .single();
      if (clinicErr || !clinic) throw new Error(clinicErr?.message ?? "Failed to create clinic");
      clinicId = clinic.id;
      clinicName = clinic.clinic_name;
    }

    // Ensure settings row exists.
    await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .upsert({ clinic_id: clinicId }, { onConflict: "clinic_id" });

    // Link the current admin's auth user to this clinic.
    const email = context.claims.email ?? "admin@bold-patients.com";
    const { error: linkErr } = await supabaseAdmin
      .from("clinic_portal_users")
      .upsert(
        { id: adminUserId, clinic_id: clinicId, email: String(email) },
        { onConflict: "id" },
      );
    if (linkErr) throw new Error(`Portal user link failed: ${linkErr.message}`);

    return { success: true as const, alreadyExisted, clinicId, clinicName };
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

// Admin-only diagnostic: probe Stripe key + basic account operations.
export const clinicflowStripeDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    if (isAdmin !== true) throw new Error("Forbidden: admin only");

    const envCandidates = ["CLINICFLOW_STRIPE_SECRET_KEY"];
    const source = envCandidates.find((k) => !!process.env[k]) ?? null;
    const key = source ? process.env[source]! : null;

    const result: {
      keySource: string | null;
      keyPrefix: string | null;
      keyLength: number | null;
      account: { id: string | null; business_name: string | null; country: string | null } | null;
      accountError: string | null;
      createTest: { ok: boolean; deletedId: string | null; error: string | null; deleteInfo: string | null };
    } = {
      keySource: source,
      keyPrefix: key ? (key.startsWith("sk_live_") ? "sk_live_" : key.startsWith("sk_test_") ? "sk_test_" : key.slice(0, 8) + "…") : null,
      keyLength: key?.length ?? null,
      account: null,
      accountError: null,
      createTest: { ok: false, deletedId: null, error: null, deleteInfo: null },
    };

    if (!key) return result;

    // 1. GET /v1/account
    try {
      const r = await fetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const j = (await r.json()) as {
        id?: string;
        business_profile?: { name?: string | null };
        settings?: { dashboard?: { display_name?: string | null } };
        country?: string;
        error?: { message?: string; code?: string; type?: string };
      };
      if (!r.ok) {
        result.accountError = JSON.stringify(j.error ?? { message: `HTTP ${r.status}`, body: j });
      } else {
        result.account = {
          id: j.id ?? null,
          business_name: j.business_profile?.name ?? j.settings?.dashboard?.display_name ?? null,
          country: j.country ?? null,
        };
      }
    } catch (e) {
      result.accountError = e instanceof Error ? e.message : String(e);
    }

    // 2. Try creating an Express account, then delete it.
    try {
      const params = new URLSearchParams();
      params.append("type", "express");
      params.append("country", "AU");
      const r = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const j = (await r.json()) as { id?: string; error?: { message?: string; code?: string; type?: string; param?: string } };
      if (!r.ok || !j.id) {
        result.createTest.error = JSON.stringify(j.error ?? { message: `HTTP ${r.status}`, body: j });
      } else {
        const del = await fetch(`https://api.stripe.com/v1/accounts/${j.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${key}` },
        });
        const delJ = (await del.json()) as { deleted?: boolean; error?: { message?: string } };
        result.createTest.ok = true;
        result.createTest.deletedId = j.id;
        result.createTest.deleteInfo = JSON.stringify({ http: del.status, deleted: delJ.deleted ?? false, error: delJ.error ?? null });
      }
    } catch (e) {
      result.createTest.error = e instanceof Error ? e.message : String(e);
    }

    return result;
  });


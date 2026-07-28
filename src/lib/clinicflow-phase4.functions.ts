import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

// ----- Follow-ups -----

export const listClinicflowFollowups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("clinicflow_followups")
      .select("id, quote_id, patient_name, due_date, task_type, status, done_at, created_at")
      .eq("clinic_id", data.clinicId)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return { followups: rows ?? [] };
  });

export const markClinicflowFollowupDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { followupId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("clinicflow_followups")
      .select("clinic_id")
      .eq("id", data.followupId)
      .maybeSingle();
    if (!row) throw new Error("Follow-up not found");
    await assertCanAccessClinic(context.supabase, row.clinic_id as string);
    const { error } = await supabaseAdmin
      .from("clinicflow_followups")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", data.followupId);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

// ----- Photos -----

export const listClinicflowPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("clinicflow_photos")
      .select("id, stage, url, caption, created_at")
      .eq("clinic_id", data.clinicId)
      .order("stage", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Sign each URL for private bucket access
    const signed = await Promise.all(
      (rows ?? []).map(async (r) => {
        const { data: sig } = await supabaseAdmin.storage
          .from("clinicflow-photos")
          .createSignedUrl(r.url as string, 60 * 60 * 24);
        return { ...r, signed_url: sig?.signedUrl ?? null };
      }),
    );
    return { photos: signed };
  });

export const addClinicflowPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { clinicId: string; stage: string; url: string; caption?: string | null }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessClinic(context.supabase, data.clinicId);
    const allowed = ["day_1", "week_1_2", "weeks_2_4", "month_3", "month_6", "month_12"];
    if (!allowed.includes(data.stage)) throw new Error("Invalid stage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clinicflow_photos").insert({
      clinic_id: data.clinicId,
      stage: data.stage,
      url: data.url,
      caption: data.caption ?? null,
    });
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

export const deleteClinicflowPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { photoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("clinicflow_photos")
      .select("clinic_id, url")
      .eq("id", data.photoId)
      .maybeSingle();
    if (!row) throw new Error("Photo not found");
    await assertCanAccessClinic(context.supabase, row.clinic_id as string);
    // Best-effort storage delete
    try {
      await supabaseAdmin.storage.from("clinicflow-photos").remove([row.url as string]);
    } catch { /* ignore */ }
    const { error } = await supabaseAdmin.from("clinicflow_photos").delete().eq("id", data.photoId);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

// Public read used by the patient-facing quote page (no auth). Resolves the
// clinic from the quote, then returns signed URLs for that clinic's photos.
export const getClinicflowPhotosForQuote = createServerFn({ method: "POST" })
  .inputValidator((data: { quoteId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await supabaseAdmin
      .from("clinicflow_quotes")
      .select("clinic_id")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (!q) return { photos: [] };
    const { data: rows } = await supabaseAdmin
      .from("clinicflow_photos")
      .select("id, stage, url, caption, created_at")
      .eq("clinic_id", q.clinic_id as string)
      .order("stage", { ascending: true })
      .order("created_at", { ascending: true });
    const signed = await Promise.all(
      (rows ?? []).map(async (r) => {
        const { data: sig } = await supabaseAdmin.storage
          .from("clinicflow-photos")
          .createSignedUrl(r.url as string, 60 * 60 * 24);
        return { ...r, signed_url: sig?.signedUrl ?? null };
      }),
    );
    return { photos: signed };
  });

// Creates a Supabase Auth user for a clinic + a clinic_portal_users row.
// Admin-only. Sends a temp password back so the admin can give it to the clinic
// (or the admin can ask them to reset).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: rep } = await admin.from("sales_reps").select("role").eq("id", userData.user.id).maybeSingle();
    if (!rep || rep.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, clinicId, password } = await req.json();
    if (!email || !clinicId) {
      return new Response(JSON.stringify({ error: "email and clinicId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate a temp password if none supplied
    const tempPassword = password || (crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "Aa1!");

    // Create user (or update password if exists)
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createErr) {
      // If user already exists, fetch them and update password
      if (createErr.message.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!existing) {
          return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        userId = existing.id;
        await admin.auth.admin.updateUserById(existing.id, { password: tempPassword });
      } else {
        return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      userId = created.user.id;
    }

    // Upsert clinic_portal_users
    const { error: linkErr } = await admin
      .from("clinic_portal_users")
      .upsert({ id: userId!, clinic_id: clinicId, email }, { onConflict: "id" });
    if (linkErr) {
      return new Response(JSON.stringify({ error: linkErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ success: true, email, password: tempPassword, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

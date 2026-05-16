// Stripe webhook: marks a lead as deposit-paid the moment Stripe confirms
// the $75 checkout. Per project rule (mem://rules/lead-status-no-auto-change),
// this does NOT touch meta_leads.status — only the deposit_* columns. The
// rep still clicks "Mark as booked" to convert the lead. Realtime on
// meta_leads is what lights up the UI.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

// Verify Stripe signature header: "t=<ts>,v1=<sig>[,v1=<sig>...]"
// Spec: https://stripe.com/docs/webhooks/signatures
function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim());
  let timestamp = "";
  const sigs: string[] = [];
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "t") timestamp = v;
    else if (k === "v1" && v) sigs.push(v);
  }
  if (!timestamp || sigs.length === 0) return false;

  // Replay-attack window
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > toleranceSec) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  for (const sig of sigs) {
    const sigBuf = Buffer.from(sig, "hex");
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

type StripeCheckoutSession = {
  id: string;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: { object: StripeCheckoutSession };
};

export const Route = createFileRoute("/api/public/hooks/stripe-deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_HTG_WEBHOOK_SECRET;
        if (!secret) {
          console.error("stripe-deposit webhook: STRIPE_HTG_WEBHOOK_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        const sigHeader = request.headers.get("stripe-signature") || "";
        const rawBody = await request.text();

        if (!verifyStripeSignature(rawBody, sigHeader, secret)) {
          console.warn("stripe-deposit webhook: invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let event: StripeEvent;
        try {
          event = JSON.parse(rawBody) as StripeEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Only act on successful checkout completion.
        if (event.type !== "checkout.session.completed") {
          return new Response(JSON.stringify({ ignored: event.type }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const session = event.data?.object;
        if (!session?.id) {
          return new Response("Malformed event", { status: 400 });
        }

        // Only credit the deposit if Stripe says it's actually paid.
        if (session.payment_status && session.payment_status !== "paid") {
          return new Response(JSON.stringify({ skipped: session.payment_status }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const leadId = session.metadata?.lead_id;
        if (!leadId) {
          console.warn("stripe-deposit webhook: no lead_id in metadata", { sessionId: session.id });
          // Return 200 so Stripe doesn't retry forever for sessions we can't match.
          return new Response("No lead_id", { status: 200 });
        }

        const supabaseUrl = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!supabaseUrl || !serviceKey) {
          console.error("stripe-deposit webhook: Supabase env missing");
          return new Response("Server misconfigured", { status: 500 });
        }
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Idempotency: skip if already marked paid for this session.
        const { data: existing } = await supabase
          .from("meta_leads")
          .select("id, deposit_paid_at, stripe_checkout_session_id, first_name, last_name, rep_id")
          .eq("id", leadId)
          .maybeSingle();

        if (!existing) {
          console.warn("stripe-deposit webhook: lead not found", { leadId, sessionId: session.id });
          return new Response("Lead not found", { status: 200 });
        }

        if (existing.deposit_paid_at && existing.stripe_checkout_session_id === session.id) {
          return new Response(JSON.stringify({ already_processed: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const amount =
          typeof session.amount_total === "number" ? session.amount_total / 100 : null;

        // IMPORTANT: do NOT touch meta_leads.status — rep clicks "Mark as booked".
        const { error: updErr } = await supabase
          .from("meta_leads")
          .update({
            deposit_paid_at: new Date().toISOString(),
            deposit_amount: amount,
            stripe_payment_intent_id: session.payment_intent ?? null,
            stripe_checkout_session_id: session.id,
          })
          .eq("id", leadId);

        if (updErr) {
          console.error("stripe-deposit webhook: meta_leads update failed", updErr);
          return new Response("DB update failed", { status: 500 });
        }

        // Best-effort: also update clinic_appointments if a booking row already exists.
        try {
          await supabase
            .from("clinic_appointments")
            .update({
              stripe_payment_intent_id: session.payment_intent ?? null,
              deposit_amount: amount,
            })
            .eq("lead_id", leadId)
            .is("stripe_payment_intent_id", null);
        } catch {
          /* non-fatal */
        }

        // Best-effort: notify ops via email on every successful deposit payment.
        // Fixed recipient is baked into the payment-received template (peter@gobold.com.au).
        try {
          const patientName =
            [existing.first_name, existing.last_name].filter(Boolean).join(" ").trim() || null;

          let repName: string | null = null;
          if (existing.rep_id) {
            const { data: rep } = await supabase
              .from("sales_reps")
              .select("name, email")
              .eq("id", existing.rep_id)
              .maybeSingle();
            repName = rep?.name || rep?.email || null;
          }

          const amountLabel =
            typeof amount === "number"
              ? `$${amount.toFixed(2)} ${(session.currency || "AUD").toUpperCase()}`
              : null;

          const paidAt = new Date().toLocaleString("en-AU", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Australia/Sydney",
          });

          const origin = new URL(request.url).origin;
          const res = await fetch(`${origin}/lovable/email/transactional/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              templateName: "payment-received",
              // `to` is hard-coded inside the template, but the send route
              // still requires a non-empty recipientEmail field.
              recipientEmail: "peter@gobold.com.au",
              idempotencyKey: `payment-received-${session.id}`,
              templateData: {
                amount: amountLabel,
                patientName,
                repName,
                leadId,
                paidAt,
              },
            }),
          });
          if (!res.ok) {
            console.warn("stripe-deposit webhook: notify email enqueue failed", res.status, await res.text());
          }
        } catch (e) {
          console.warn("stripe-deposit webhook: notify email error", e);
        }

        return new Response(JSON.stringify({ ok: true, leadId }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

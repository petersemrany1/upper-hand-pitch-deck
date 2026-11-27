// Ported from the Legal app (family-law-floater/src/routes/api/public/firm-offers/sms-status.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/legal/firm-offers/sms-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { validateTwilioSignature } = await import("@/legal/lib/twilio.server");
        const url = new URL(request.url),
          origin = legalEnv["BOLD_OFFER_ORIGIN"];
        if (!origin) return new Response("Not configured", { status: 503 });
        const raw = await request.text();
        if (raw.length > 10000) return new Response("Too large", { status: 413 });
        const params = Object.fromEntries(new URLSearchParams(raw));
        if (
          !validateTwilioSignature(
            new URL(url.pathname + url.search, origin).href,
            params,
            request.headers.get("x-twilio-signature"),
          )
        )
          return new Response("Invalid signature", { status: 403 });
        const id = url.searchParams.get("job");
        if (!id || !/^[a-f0-9-]{36}$/i.test(id))
          return new Response("Invalid job", { status: 400 });
        const { db, loadOffer, saveOffer } = await import("@/legal/lib/firm-offers/store.server");
        const job = await db
          .from("firm_offer_outbox")
          .select("offer_id,channel")
          .eq("id", id)
          .single();
        if (job.error || job.data.channel !== "sms")
          return new Response("Unknown job", { status: 404 });
        const o = await loadOffer(job.data.offer_id);
        if (
          params["To"] !== o.draft.mobile ||
          params["From"] !== legalEnv["BOLD_OFFER_SMS_FROM"]
        )
          return new Response("Recipient mismatch", { status: 400 });
        const state =
          params["MessageStatus"] === "delivered"
            ? "delivered"
            : ["failed", "undelivered"].includes(params["MessageStatus"] ?? "")
              ? "failed"
              : null;
        if (state) {
          const { error } = await db
            .from("firm_offer_outbox")
            .update({
              state,
              provider_id: params["MessageSid"],
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .in("state", ["submitting", "submitted", "uncertain"]);
          if (error) return new Response("Persistence failed", { status: 503 });
          if (state === "failed")
            await saveOffer(
              { ...o, paused: true },
              "SMS delivery failed; destination review required",
            );
        }
        return new Response("ok");
      },
    },
  },
});

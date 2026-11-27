// Ported from the Legal app (family-law-floater/src/lib/phone-numbers.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: {
  rpc: (fn: "is_admin_user") => Promise<{ data: unknown; error: { message: string } | null }>;
}): Promise<void> {
  const { data, error } = await supabase.rpc("is_admin_user");
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden");
}

type BuyResult = { ok: true; number: string } | { ok: false; error: string };

/**
 * Buy an MMS-capable AU mobile number and add it to the outbound pool. Admin only.
 * Always resolves — failures come back as { ok: false, error } so the UI can show the
 * real Twilio message instead of a silent rejection.
 */
export const buyPoolNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BuyResult> => {
    await assertAdmin(context.supabase as never);

    const { buyAuMobileNumber } = await import("./phone-numbers.server");
    let purchased: { number: string; sid: string; friendlyName: string };
    try {
      purchased = await buyAuMobileNumber();
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    const { error } = await context.supabase
      .from("phone_numbers")
      .insert({ number: purchased.number, status: "active" });
    if (error) {
      const { logTwilioError } = await import("./phone-numbers.server");
      await logTwilioError("buy_phone_number", "Purchased but could not save to the pool", {
        number: purchased.number,
        sid: purchased.sid,
        db: error.message,
      });
      return {
        ok: false,
        error: `Bought ${purchased.number} but could not save it to the pool: ${error.message}`,
      };
    }

    return { ok: true, number: purchased.number };
  });

/**
 * Read-only diagnosis: recover any LegalGroup-Pool numbers Twilio already owns that
 * are missing from the pool, then walk the purchase steps without buying. Admin only.
 */
export const diagnosePoolNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never);

    const { dryRunPurchaseSteps, listPoolNumbersOnTwilio, repairInboundUrls } =
      await import("./phone-numbers.server");

    const recovered: string[] = [];
    const owned = await listPoolNumbersOnTwilio();
    let ownedError: string | null = null;
    if (!owned.ok) {
      ownedError = owned.error;
    } else {
      const { data: rows } = await context.supabase.from("phone_numbers").select("number");
      const known = new Set((rows ?? []).map((r) => r.number));
      for (const item of owned.numbers) {
        const wrongHooks =
          !item.voiceUrl.includes("/api/public/legal/hooks/twilio-voice-inbound") ||
          !item.smsUrl.includes("/api/public/legal/hooks/twilio-sms-inbound");
        if (wrongHooks) await repairInboundUrls(item.sid);
        if (known.has(item.number)) continue;
        const { error } = await context.supabase
          .from("phone_numbers")
          .insert({ number: item.number, status: "active" });
        if (!error) recovered.push(item.number);
      }
    }

    let steps: Array<{ step: string; ok: boolean; status: number; detail: string }> = [];
    try {
      steps = await dryRunPurchaseSteps();
    } catch (error) {
      steps = [
        {
          step: "credentials",
          ok: false,
          status: 0,
          detail: error instanceof Error ? error.message : String(error),
        },
      ];
    }

    return { recovered, ownedError, steps };
  });

/** Delete the number from Twilio, then remove the pool row. Admin only. */
export const releasePoolNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id || typeof input.id !== "string") throw new Error("id is required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);

    const { data: row, error } = await context.supabase
      .from("phone_numbers")
      .select("id, number, last_assigned_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That number is no longer in the pool");

    // Firm Cold Calling: a caller ID must stay live for 30 days after it was
    // shown to a prospect, so the firm can call back. Check BEFORE touching Twilio.
    const { retentionEndsAt } = await import("./cold-calling/daily-phone");
    const keepUntil = retentionEndsAt(row.last_assigned_at);
    if (keepUntil && keepUntil.getTime() > Date.now()) {
      throw new Error(
        `${row.number} was used for firm cold calling and must stay active until ${keepUntil.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}.`,
      );
    }

    const { releaseTwilioNumber } = await import("./phone-numbers.server");
    const released = await releaseTwilioNumber(row.number);
    if (!released.ok)
      throw new Error(released.error ?? "Could not release that number from Twilio");

    const { error: deleteError } = await context.supabase
      .from("phone_numbers")
      .delete()
      .eq("id", row.id);
    if (deleteError) throw new Error(deleteError.message);

    return { number: row.number };
  });

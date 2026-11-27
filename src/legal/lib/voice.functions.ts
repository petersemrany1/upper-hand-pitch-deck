// Ported from the Legal app (family-law-floater/src/lib/voice.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireVoiceAccess } from "@/legal/lib/portal-access-middleware";

/** Mint a Twilio Voice token for the logged-in rep. Requires an active sales_reps row. */
export const getVoiceToken = createServerFn({ method: "POST" })
  .middleware([requireVoiceAccess])
  .handler(async ({ context }) => {
    const { data: rep, error } = await context.supabase
      .from("sales_reps")
      .select("id, name, is_active")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rep) throw new Error("You need an active advisor profile to make calls");

    const { mintVoiceToken, repIdentity } = await import("./twilio-voice.server");
    const minted = await mintVoiceToken(repIdentity(rep.id));
    return { token: minted.token, identity: minted.identity, repId: rep.id };
  });

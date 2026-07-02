import { authedServerFn } from "@/lib/authed-fn";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAndRecordSms } from "@/services/sms.server";

const TWILIO_FROM = "+61468031075";

export const sendSms = authedServerFn({ method: "POST" })
  .inputValidator(
    (data: { to: string; body?: string; mediaUrls?: string[] }) => ({
      to: String(data.to ?? ""),
      body: data.body ?? "",
      mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls.filter(Boolean) : [],
    }),
  )
  .handler(async ({ data }) => {
    const result = await sendAndRecordSms({
      to: data.to,
      from: TWILIO_FROM,
      body: data.body,
      mediaUrls: data.mediaUrls,
      logSource: "sendSms",
    });
    return result;
  });

// Reset unread count when user opens a thread
export const markThreadRead = authedServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => ({ threadId: String(data.threadId ?? "") }))
  .handler(async ({ data }) => {
    if (!data.threadId) return { success: false as const, error: "threadId required" };
    const { error } = await supabaseAdmin
      .from("sms_threads")
      .update({ unread_count: 0 })
      .eq("id", data.threadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

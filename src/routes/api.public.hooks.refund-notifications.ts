import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { processRefundNotifications, refundDatabase } from "@/utils/refund-notifications.server";

export async function handleRefundNotifications(request: Request) {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected) return Response.json({ error: "Server misconfigured" }, { status: 500 });
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer /i, "");
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { dryRun?: boolean } = {};
  try { body = await request.json(); } catch { /* empty cron body */ }
  try { return Response.json(await processRefundNotifications(refundDatabase(), body.dryRun === true)); }
  catch (error) {
    console.error("Refund notification worker failed", error);
    return Response.json({ error: "Refund notifications need attention" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/hooks/refund-notifications")({ server: { handlers: { POST: ({ request }) => handleRefundNotifications(request) } } });

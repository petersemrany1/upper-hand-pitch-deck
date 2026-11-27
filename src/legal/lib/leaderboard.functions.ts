// Ported from the Legal app (family-law-floater/src/lib/leaderboard.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireLeaderboardAccess } from "@/legal/lib/portal-access-middleware";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const rangeSchema = z.union([
  z.enum(["today", "yesterday", "week", "lastweek", "month", "lastmonth", "30d"]),
  z.object({ from: ymd, to: ymd }).refine((r) => r.from <= r.to, "From must be on or before To"),
]);
export type LeaderboardRangeInput = z.infer<typeof rangeSchema>;

/** Staff only (admin or sales rep). Reads across all reps server-side. */
export const getLeaderboardFn = createServerFn({ method: "POST" })
  .middleware([requireLeaderboardAccess])
  .inputValidator((data: { range: LeaderboardRangeInput }) => ({
    range: rangeSchema.parse(data.range),
  }))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isRep }] = await Promise.all([
      context.supabase.rpc("is_admin_user"),
      context.supabase.rpc("has_sales_role"),
    ]);
    if (isAdmin !== true && isRep !== true) throw new Error("Staff only");
    const { getLeaderboard } = await import("./leaderboard.server");
    return { rows: await getLeaderboard(data.range), generatedAt: new Date().toISOString() };
  });

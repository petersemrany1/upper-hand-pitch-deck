// Ported from the Legal app (family-law-floater/src/lib/cold-calling/applicants.server.ts). Re-run the port script to refresh.
// Server side of "a Meta applicant is never cold called": find the prospects a
// firm application matches and withdraw them from the calling list.
// Never import from client code.
import {
  applicationKeys,
  hasAnyKey,
  planWithdrawals,
  type ApplicationLike,
  type ProspectMatchTarget,
} from "./applicants";
import { audit, type Db } from "./cold-calling.server";

const MATCH_COLUMNS = "id, firm_name, phone_e164, root_domain, prospect_status, do_not_contact";

async function applyWithdrawals(
  db: Db,
  plan: ReturnType<typeof planWithdrawals>,
  actorUserId: string | null,
): Promise<number> {
  let done = 0;
  for (const { firm, app, reason, patch } of plan) {
    const { error } = await db
      .from("prospect_firms")
      .update(patch)
      .eq("id", firm.id)
      .eq("do_not_contact", false);
    if (error) {
      console.error("[cold-calling] withdraw applicant failed", firm.id, error.message);
      continue;
    }
    done += 1;
    await audit(db, actorUserId, "firm_withdrawn_meta_application", firm.id, {
      applicationId: app.id,
      reason,
      previousStatus: firm.prospect_status,
    });
  }
  return done;
}

/**
 * One application just arrived: pull every prospect it matches out of the
 * calling list. A handful of targeted queries, so it is cheap enough to run
 * inside the webhook.
 */
export async function withdrawProspectsForApplication(
  db: Db,
  app: ApplicationLike,
  now: Date = new Date(),
): Promise<number> {
  const keys = applicationKeys(app);
  if (!hasAnyKey(keys)) return 0;
  const filters: string[] = [];
  if (keys.phoneTail) filters.push(`phone_e164.like.*${keys.phoneTail}`);
  if (keys.domain) filters.push(`root_domain.eq.${keys.domain}`);
  if (keys.nameKey && keys.nameToken && /^[a-z0-9]+$/.test(keys.nameToken))
    filters.push(`firm_name.ilike.*${keys.nameToken}*`);
  if (!filters.length) return 0;
  const { data, error } = await db
    .from("prospect_firms")
    .select(MATCH_COLUMNS)
    .or(filters.join(","))
    .limit(500);
  if (error) {
    console.error("[cold-calling] applicant lookup failed", error.message);
    return 0;
  }
  return applyWithdrawals(
    db,
    planWithdrawals((data ?? []) as ProspectMatchTarget[], [app], now),
    null,
  );
}

async function loadApplications(db: Db): Promise<ApplicationLike[]> {
  const out: ApplicationLike[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("firm_applications")
      .select("id, first_name, last_name, email, phone, firm_name")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * Prospects were just imported: any that already applied through Meta must not
 * enter the calling list. One read of the applications, then per-firm updates.
 */
export async function withdrawAppliedAmong(
  db: Db,
  firmIds: readonly string[],
  actorUserId: string | null,
  now: Date = new Date(),
): Promise<number> {
  if (!firmIds.length) return 0;
  const apps = await loadApplications(db);
  if (!apps.length) return 0;
  const { data, error } = await db
    .from("prospect_firms")
    .select(MATCH_COLUMNS)
    .in("id", [...firmIds]);
  if (error) throw new Error(error.message);
  return applyWithdrawals(
    db,
    planWithdrawals((data ?? []) as ProspectMatchTarget[], apps, now),
    actorUserId,
  );
}

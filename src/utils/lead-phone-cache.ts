import { supabase } from "@/integrations/supabase/client";

// Shared, cached lead-phone lookups.
//
// Several notification surfaces (missed calls list, missed-call toast, the
// notification bell, the messenger, the inbox) previously fetched EVERY
// meta_leads row just to map a phone number to a name — and they did it on
// every realtime call_records event. During a calling session that meant
// hundreds of full-table scans a minute, which slowed the whole portal and
// starved the Twilio voice webhook of database time (Twilio gives up after
// 15s and plays "an application error has occurred").
//
// These helpers collapse all of that into one cached fetch shared by every
// caller, with in-flight de-duplication so concurrent callers reuse one query.

const TTL_MS = 120_000;

function digitsOnly(s: string | null | undefined): string {
  return (s || "").replace(/[^0-9]/g, "");
}

type NameCache = {
  byTail: Map<string, string>;
  byDigits: Map<string, string>;
  at: number;
};

let nameCache: NameCache | null = null;
let nameInFlight: Promise<NameCache> | null = null;

async function fetchNames(): Promise<NameCache> {
  const { data } = await supabase
    .from("meta_leads")
    .select("first_name, last_name, phone")
    .not("phone", "is", null);
  const byTail = new Map<string, string>();
  const byDigits = new Map<string, string>();
  for (const l of (data || []) as Array<{ first_name: string | null; last_name: string | null; phone: string | null }>) {
    const digits = digitsOnly(l.phone);
    if (!digits) continue;
    const name = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
    if (!name) continue;
    if (!byDigits.has(digits)) byDigits.set(digits, name);
    const tail = digits.slice(-9);
    if (tail.length >= 6 && !byTail.has(tail)) byTail.set(tail, name);
  }
  return { byTail, byDigits, at: Date.now() };
}

/** Cached phone → lead-name lookup maps (keyed by full digits and last 9 digits). */
export async function getLeadNameIndex(force = false): Promise<NameCache> {
  if (!force && nameCache && Date.now() - nameCache.at < TTL_MS) return nameCache;
  if (!nameInFlight) {
    nameInFlight = fetchNames()
      .then((c) => {
        nameCache = c;
        return c;
      })
      .finally(() => {
        nameInFlight = null;
      });
  }
  return nameInFlight;
}

/** Name for a phone number, matching on the last 9 digits. */
export async function getLeadNameForPhone(phone: string | null | undefined): Promise<string | null> {
  const digits = digitsOnly(phone);
  if (!digits) return null;
  const index = await getLeadNameIndex();
  return index.byDigits.get(digits) ?? index.byTail.get(digits.slice(-9)) ?? null;
}

const tailsCache = new Map<string, { tails: Set<string>; at: number }>();
const tailsInFlight = new Map<string, Promise<Set<string>>>();

/** Cached set of phone-tails (last 9 digits) for leads owned by a rep. */
export async function getRepLeadPhoneTails(repId: string): Promise<Set<string>> {
  const cached = tailsCache.get(repId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.tails;
  const existing = tailsInFlight.get(repId);
  if (existing) return existing;
  const promise = (async () => {
    const { data } = await supabase
      .from("meta_leads")
      .select("phone")
      .eq("rep_id", repId)
      .not("phone", "is", null);
    const tails = new Set<string>();
    for (const l of (data || []) as Array<{ phone: string | null }>) {
      const tail = digitsOnly(l.phone).slice(-9);
      if (tail.length >= 6) tails.add(tail);
    }
    tailsCache.set(repId, { tails, at: Date.now() });
    return tails;
  })().finally(() => {
    tailsInFlight.delete(repId);
  });
  tailsInFlight.set(repId, promise);
  return promise;
}

/** Drop cached data (e.g. after creating a lead) so the next read refetches. */
export function invalidateLeadPhoneCache() {
  nameCache = null;
  tailsCache.clear();
}

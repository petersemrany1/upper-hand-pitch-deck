// Lets unchanged Legal app code run against the Legal area of the portal
// database. Legal tables, views and functions live there as legal_<name> and
// storage buckets as legal-<name>; this wraps a Supabase client so that
// .from("firms"), .rpc("is_admin_user"), .storage.from("firm-offers") and
// realtime subscriptions reach those names, and embedded selects keep the
// original keys (firms(...) becomes firms:legal_firms(...)).
import { LEGAL_BUCKETS, LEGAL_FOREIGN_KEYS, LEGAL_FUNCTIONS, LEGAL_RELATIONS } from "./names";

export const TABLE_PREFIX = "legal_";
export const BUCKET_PREFIX = "legal-";

export const legalRelation = (name: string) => (LEGAL_RELATIONS.has(name) ? TABLE_PREFIX + name : name);
export const legalFunction = (name: string) => (LEGAL_FUNCTIONS.has(name) ? TABLE_PREFIX + name : name);
export const legalBucket = (name: string) => (LEGAL_BUCKETS.has(name) ? BUCKET_PREFIX + name : name);

/**
 * Rewrite a PostgREST select list. Embedded resources are renamed and aliased
 * back to their Legal names so the result shape is unchanged:
 *   "id, firms(firm_name)"            -> "id, firms:legal_firms(firm_name)"
 *   "x:firms!inner(id)"               -> "x:legal_firms!inner(id)"
 *   "firms!firm_appointments_firm_id_fkey(id)" -> "firms:legal_firms!legal_firm_appointments_firm_id_fkey(id)"
 */
export function rewriteSelect(select: string): string {
  return select.replace(
    /(^|[\s,(])(?:([A-Za-z_][A-Za-z0-9_]*)\s*:\s*)?([A-Za-z_][A-Za-z0-9_]*)(!([A-Za-z_][A-Za-z0-9_]*))?(\s*)\(/g,
    (match, lead: string, alias: string | undefined, name: string, bang: string | undefined, hint: string | undefined, space: string) => {
      if (!LEGAL_RELATIONS.has(name)) return match;
      const target = TABLE_PREFIX + name;
      const label = alias ?? name;
      let suffix = "";
      if (hint) suffix = LEGAL_FOREIGN_KEYS.has(hint) ? `!${TABLE_PREFIX}${hint}` : bang!;
      return `${lead}${label}:${target}${suffix}${space}(`;
    },
  );
}

type AnyFn = (...args: unknown[]) => unknown;

/** Wrap a query builder so any later .select(list) is rewritten too. */
function wrapBuilder<T extends object>(builder: T): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== "function") return value;
      if (prop === "then" || prop === "catch" || prop === "finally") return (value as AnyFn).bind(target);
      return (...args: unknown[]) => {
        if (prop === "select" && typeof args[0] === "string") args[0] = rewriteSelect(args[0]);
        const result = (value as AnyFn).apply(target, args);
        return result && typeof result === "object" && "then" in (result as object) ? wrapBuilder(result as object) : result;
      };
    },
  });
}

function wrapChannel<T extends object>(channel: T): T {
  return new Proxy(channel, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (prop === "on" && args[0] === "postgres_changes" && args[1] && typeof args[1] === "object") {
          const filter = { ...(args[1] as Record<string, unknown>) };
          if (typeof filter.table === "string") filter.table = legalRelation(filter.table);
          args[1] = filter;
        }
        const result = (value as AnyFn).apply(target, args);
        return result === target ? receiver : result;
      };
    },
  });
}

/** A client that reads and writes the Legal area of the portal database. */
export function legalScopedClient<T extends object>(client: T): T {
  const c = client as unknown as {
    from: (name: string) => object;
    rpc: (fn: string, args?: unknown, opts?: unknown) => object;
    channel: (...args: unknown[]) => object;
    storage: { from: (bucket: string) => object };
  };
  const storage = new Proxy(c.storage, {
    get(target, prop, receiver) {
      if (prop === "from") return (bucket: string) => target.from(legalBucket(bucket));
      const value = Reflect.get(target, prop, receiver) as unknown;
      return typeof value === "function" ? (value as AnyFn).bind(target) : value;
    },
  });
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") return (name: string) => wrapBuilder(c.from(legalRelation(name)));
      if (prop === "rpc") return (fn: string, args?: unknown, opts?: unknown) => wrapBuilder(c.rpc(legalFunction(fn), args, opts));
      if (prop === "channel") return (...args: unknown[]) => wrapChannel(c.channel(...args));
      if (prop === "storage") return storage;
      const value = Reflect.get(target, prop, receiver) as unknown;
      return typeof value === "function" ? (value as AnyFn).bind(target) : value;
    },
  });
}

import type { Database } from "@/integrations/supabase/types";

/**
 * Shared helpers for the data layer (src/data). Repositories throw on
 * Supabase errors so React Query can surface them via `error` — no more
 * silently-ignored `{ data }` destructuring.
 */

export type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];

/** Unwrap a Supabase response: return data, throw on error. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error("No data returned");
  return res.data;
}

/** Unwrap where null data is a legitimate "not found". */
export function unwrapMaybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

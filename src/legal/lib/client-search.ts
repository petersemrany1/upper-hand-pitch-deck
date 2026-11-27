// Ported from the Legal app (family-law-floater/src/lib/client-search.ts). Re-run the port script to refresh.
/** Literal search terms only: user punctuation must never become PostgREST syntax. */
export function clientSearchFilters(search: string): string[] {
  const query = search.trim().slice(0, 100);
  if (query.length < 2) return [];
  if (/^[+\d\s().-]+$/.test(query)) {
    let digits = query.replace(/\D/g, "");
    if (digits.length >= 10) digits = digits.replace(/^(?:61|0)/, "");
    if (digits.length < 3) return [];
    return [`phone.ilike.${JSON.stringify(`%${digits.split("").join("%")}%`)}`];
  }
  return query
    .replace(/[^\p{L}\p{N}@.+' -]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((term) => {
      const value = JSON.stringify(`%${term}%`);
      return ["first_name", "last_name", "email"]
        .map((field) => `${field}.ilike.${value}`)
        .join(",");
    });
}

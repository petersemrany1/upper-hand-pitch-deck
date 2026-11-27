// Ported from the Legal app (family-law-floater/src/lib/portal-access.ts). Re-run the port script to refresh.
/** Deny restricted accounts before a server function can use privileged data. */
export async function assertFullPortalAccess(supabase: {
  rpc: (fn: "is_sales_only_user") => PromiseLike<{ data: unknown; error: unknown }>;
}): Promise<void> {
  const { data, error } = await supabase.rpc("is_sales_only_user");
  if (error || typeof data !== "boolean") throw new Error("Could not verify portal access");
  if (data) throw new Error("This account can only access Sales Call and the phone inbox");
}

/** Check the current database grant on every server request, before privileged work. */
export async function assertPortalPageAccess(
  supabase: {
    rpc: (
      fn: "can_access_portal_page",
      args: { p_page: string },
    ) => PromiseLike<{ data: unknown; error: unknown }>;
  },
  pages: readonly string[],
): Promise<void> {
  const results = await Promise.all(
    pages.map((page) => supabase.rpc("can_access_portal_page", { p_page: page })),
  );
  if (!results.length || results.some((r) => r.error || typeof r.data !== "boolean"))
    throw new Error("Could not verify portal access");
  if (!results.some((r) => r.data === true)) throw new Error("You do not have access to this tab");
}

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { keys } from "./keys";
import { unwrap, type Row, type Update } from "./db";

export type Lead = Row<"meta_leads">;

export const leadsRepo = {
  async list(limit = 1000): Promise<Lead[]> {
    return unwrap(
      await supabase
        .from("meta_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)
    );
  },

  async update(id: string, patch: Update<"meta_leads">): Promise<void> {
    const { error } = await supabase.from("meta_leads").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async bulkAssign(ids: string[], repId: string | null): Promise<void> {
    const { error } = await supabase
      .from("meta_leads")
      .update({ rep_id: repId })
      .in("id", ids);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("meta_leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export function useLeads(limit = 1000) {
  return useQuery({
    queryKey: keys.leads.list({ limit }),
    queryFn: () => leadsRepo.list(limit),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Update<"meta_leads"> }) =>
      leadsRepo.update(id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.leads.all }),
  });
}

export function useBulkAssignLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, repId }: { ids: string[]; repId: string | null }) =>
      leadsRepo.bulkAssign(ids, repId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.leads.all }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leadsRepo.remove,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.leads.all }),
  });
}

/* ------------------------------------------------------------------
   Scale path (Phase 7): keyset pagination + server-side search.
   Never load the whole table — pages of PAGE_SIZE ordered by
   (created_at DESC, id DESC), with search pushed down to Postgres.
   ------------------------------------------------------------------ */

export const LEADS_PAGE_SIZE = 200;

export type LeadsCursor = { createdAt: string; id: string } | null;
export type LeadsPage = { rows: Lead[]; nextCursor: LeadsCursor };

export async function fetchLeadsPage(args: {
  cursor: LeadsCursor;
  search?: string;
}): Promise<LeadsPage> {
  let q = supabase
    .from("meta_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LEADS_PAGE_SIZE);

  const s = (args.search ?? "").trim();
  if (s) {
    const safe = s.replace(/[%,()]/g, " ").trim();
    if (safe) {
      const pat = `%${safe}%`;
      q = q.or(
        [
          `first_name.ilike.${pat}`,
          `last_name.ilike.${pat}`,
          `email.ilike.${pat}`,
          `phone.ilike.${pat}`,
          `campaign_name.ilike.${pat}`,
          `ad_name.ilike.${pat}`,
          `ad_set_name.ilike.${pat}`,
          `status.ilike.${pat}`,
        ].join(",")
      );
    }
  }

  if (args.cursor) {
    // keyset: strictly older than the cursor row
    q = q.or(
      `created_at.lt.${args.cursor.createdAt},and(created_at.eq.${args.cursor.createdAt},id.lt.${args.cursor.id})`
    );
  }

  const rows = unwrap(await q);
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor:
      rows.length === LEADS_PAGE_SIZE && last
        ? { createdAt: last.created_at, id: last.id }
        : null,
  };
}

export function useInfiniteLeads(search: string) {
  return useInfiniteQuery({
    queryKey: keys.leads.list({ search }),
    queryFn: ({ pageParam }) => fetchLeadsPage({ cursor: pageParam, search }),
    initialPageParam: null as LeadsCursor,
    getNextPageParam: (last) => last.nextCursor,
  });
}

/* ------------------------------------------------------------------
   Rep queue RPC (Phase 7): Postgres computes the locked ordering —
   callbacks due first, then new leads newest-first — so the dialler
   gets the top-N that MATTER, not a newest-created window that would
   miss due callbacks once the table outgrows the window.
   ------------------------------------------------------------------ */

export async function fetchRepQueue(limit = 200): Promise<Lead[] | null> {
  // The RPC ships in migration 20260702010000; fall back gracefully until
  // it's applied. (Generated types don't know it yet, hence the cast.)
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: { lead: Lead }[] | null; error: { message: string } | null }>)(
    "get_rep_queue",
    { p_limit: limit }
  );
  if (error || !data) return null;
  return data.map((r) => r.lead);
}

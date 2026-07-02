import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

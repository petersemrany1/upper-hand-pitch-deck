import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { keys } from "./keys";
import { unwrap, type Row, type Update } from "./db";

export type CallRecord = Row<"call_records">;

export const callsRepo = {
  async recent(limit = 50): Promise<CallRecord[]> {
    return unwrap(
      await supabase
        .from("call_records")
        .select("*")
        .order("called_at", { ascending: false })
        .limit(limit)
    );
  },

  async update(id: string, patch: Update<"call_records">): Promise<void> {
    const { error } = await supabase.from("call_records").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async linkToClient(twilioCallSid: string, clientId: string): Promise<void> {
    const { error } = await supabase
      .from("call_records")
      .update({ client_id: clientId })
      .eq("twilio_call_sid", twilioCallSid);
    if (error) throw new Error(error.message);
  },
};

export function useRecentCalls(limit = 50) {
  return useQuery({
    queryKey: keys.calls.records({ limit }),
    queryFn: () => callsRepo.recent(limit),
  });
}

export function useUpdateCallRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Update<"call_records"> }) =>
      callsRepo.update(id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.calls.all }),
  });
}

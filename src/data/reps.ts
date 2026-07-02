import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { keys } from "./keys";
import { unwrap } from "./db";

export type RepSummary = { id: string; name: string; email: string | null };

export const repsRepo = {
  async list(): Promise<RepSummary[]> {
    return unwrap(
      await supabase.from("sales_reps").select("id, name, email").order("name")
    );
  },
};

export function useReps() {
  return useQuery({ queryKey: keys.reps.list(), queryFn: repsRepo.list });
}

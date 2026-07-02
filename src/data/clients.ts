import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { keys } from "./keys";
import { unwrap, type Insert, type Row } from "./db";

export type Client = Row<"clients">;

export const clientsRepo = {
  async list(): Promise<Client[]> {
    return unwrap(
      await supabase.from("clients").select("*").order("created_at", { ascending: false })
    );
  },

  async create(input: Insert<"clients">): Promise<Client> {
    return unwrap(await supabase.from("clients").insert(input).select().single());
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export function useClients() {
  return useQuery({ queryKey: keys.clients.list(), queryFn: clientsRepo.list });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientsRepo.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.clients.all }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientsRepo.remove,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.clients.all }),
  });
}

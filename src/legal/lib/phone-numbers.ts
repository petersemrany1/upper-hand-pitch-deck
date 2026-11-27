// Ported from the Legal app (family-law-floater/src/lib/phone-numbers.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";

export type PoolNumber = {
  id: string;
  number: string;
  status: string;
  call_count: number;
  last_used_at: string | null;
  created_at: string;
};

export async function fetchPoolNumbers(): Promise<PoolNumber[]> {
  const { data, error } = await supabase
    .from("phone_numbers")
    .select("id, number, status, call_count, last_used_at, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PoolNumber[];
}

export async function setPoolNumberStatus(id: string, status: "active" | "inactive"): Promise<void> {
  const { error } = await supabase.from("phone_numbers").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export function formatLastUsed(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Ported from the Legal app (family-law-floater/src/lib/linking-education.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";

export type LinkingPlay = {
  id: string;
  chip_label: string;
  group_label: string | null;
  sort_order: number;
  priority: number;
  callback_opener: string;
  prompt_title: string;
  say_this: string;
  never_say: string | null;
  active: boolean;
};

const COLUMNS =
  "id, chip_label, group_label, sort_order, priority, callback_opener, prompt_title, say_this, never_say, active";


/** Rep-facing: active plays only, chip order. */
export async function fetchActiveLinkingPlays(): Promise<LinkingPlay[]> {
  const { data, error } = await supabase
    .from("linking_education_plays")
    .select(COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LinkingPlay[];
}

/** Admin-facing: every play, including inactive. */
export async function fetchAllLinkingPlays(): Promise<LinkingPlay[]> {
  const { data, error } = await supabase
    .from("linking_education_plays")
    .select(COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LinkingPlay[];
}

export type LinkingPlayInput = Omit<LinkingPlay, "id">;

export async function createLinkingPlay(input: LinkingPlayInput): Promise<void> {
  const { error } = await supabase.from("linking_education_plays").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateLinkingPlay(
  id: string,
  patch: Partial<LinkingPlayInput>,
): Promise<void> {
  const { error } = await supabase.from("linking_education_plays").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLinkingPlay(id: string): Promise<void> {
  const { error } = await supabase.from("linking_education_plays").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Lower priority first; ties broken by chip order. */
export function rankPlays(plays: LinkingPlay[]): LinkingPlay[] {
  return [...plays].sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order);
}

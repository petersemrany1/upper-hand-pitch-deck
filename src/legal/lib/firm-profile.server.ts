// Ported from the Legal app (family-law-floater/src/lib/firm-profile.server.ts). Re-run the port script to refresh.
// Server-only machinery for the admin-only Firm Profile feature.
// Firm portal users must never reach this data: every caller is checked as an
// admin in the server-function layer, and RLS has admin-only policies.

export type ProfileItem = {
  id: string;
  section_id: string;
  body: string;
  sort_order: number;
  created_at: string;
};

export type ProfileSection = {
  id: string;
  firm_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  items: ProfileItem[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getFirmProfile(firmId: string): Promise<ProfileSection[]> {
  const db = await admin();
  const { data: sections, error } = await db
    .from("firm_profile_sections")
    .select("id, firm_id, title, sort_order, created_at")
    .eq("firm_id", firmId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = sections ?? [];
  if (rows.length === 0) return [];

  const { data: items, error: itemErr } = await db
    .from("firm_profile_items")
    .select("id, section_id, body, sort_order, created_at")
    .in(
      "section_id",
      rows.map((s) => s.id),
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (itemErr) throw new Error(itemErr.message);

  return rows.map((s) => ({
    ...s,
    items: (items ?? []).filter((i) => i.section_id === s.id),
  }));
}

async function nextSectionOrder(firmId: string): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("firm_profile_sections")
    .select("sort_order")
    .eq("firm_id", firmId)
    .order("sort_order", { ascending: false })
    .limit(1);
  return ((data?.[0]?.sort_order ?? -1) as number) + 1;
}

async function nextItemOrder(sectionId: string): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("firm_profile_items")
    .select("sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1);
  return ((data?.[0]?.sort_order ?? -1) as number) + 1;
}

export async function createProfileSection(firmId: string, title: string): Promise<{ id: string }> {
  const clean = title.trim();
  if (!clean) throw new Error("A section needs a title");
  const db = await admin();
  const { data, error } = await db
    .from("firm_profile_sections")
    .insert({ firm_id: firmId, title: clean, sort_order: await nextSectionOrder(firmId) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export const STARTER_SECTIONS = [
  "About the firm",
  "Credentials",
  "Why clients choose them",
  "Results and stories",
  "Fees and payment",
  "Money and funding",
  "Booking and logistics",
  "Who they won't take on",
];

export async function setUpProfile(firmId: string): Promise<{ created: number }> {
  const existing = await getFirmProfile(firmId);
  if (existing.length > 0) return { created: 0 };
  const db = await admin();
  const { error } = await db
    .from("firm_profile_sections")
    .insert(STARTER_SECTIONS.map((title, i) => ({ firm_id: firmId, title, sort_order: i })));
  if (error) throw new Error(error.message);
  return { created: STARTER_SECTIONS.length };
}

export async function renameProfileSection(sectionId: string, title: string): Promise<{ ok: true }> {
  const clean = title.trim();
  if (!clean) throw new Error("A section needs a title");
  const db = await admin();
  const { error } = await db
    .from("firm_profile_sections")
    .update({ title: clean })
    .eq("id", sectionId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteProfileSection(sectionId: string): Promise<{ ok: true }> {
  const db = await admin();
  const { error } = await db.from("firm_profile_sections").delete().eq("id", sectionId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type Direction = "up" | "down";

export async function moveProfileSection(sectionId: string, direction: Direction): Promise<{ ok: true }> {
  const db = await admin();
  const { data: current, error } = await db
    .from("firm_profile_sections")
    .select("id, firm_id, sort_order, created_at")
    .eq("id", sectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!current) throw new Error("Section not found");

  const { data: siblings, error: sErr } = await db
    .from("firm_profile_sections")
    .select("id, sort_order, created_at")
    .eq("firm_id", current.firm_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (sErr) throw new Error(sErr.message);

  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === sectionId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  const neighbour = list[swapIdx];
  if (idx < 0 || !neighbour) return { ok: true };

  // Normalise to index positions so equal sort_order values still move.
  const updates = list.map((s, i) => ({
    id: s.id,
    sort_order: i === idx ? swapIdx : i === swapIdx ? idx : i,
  }));
  for (const u of updates) {
    const { error: uErr } = await db
      .from("firm_profile_sections")
      .update({ sort_order: u.sort_order })
      .eq("id", u.id);
    if (uErr) throw new Error(uErr.message);
  }
  return { ok: true };
}

export async function createProfileItem(sectionId: string, body: string): Promise<{ id: string }> {
  const clean = body.trim();
  if (!clean) throw new Error("A bullet needs some text");
  const db = await admin();
  const { data, error } = await db
    .from("firm_profile_items")
    .insert({ section_id: sectionId, body: clean, sort_order: await nextItemOrder(sectionId) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateProfileItem(itemId: string, body: string): Promise<{ ok: true }> {
  const clean = body.trim();
  if (!clean) throw new Error("A bullet needs some text");
  const db = await admin();
  const { error } = await db.from("firm_profile_items").update({ body: clean }).eq("id", itemId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteProfileItem(itemId: string): Promise<{ ok: true }> {
  const db = await admin();
  const { error } = await db.from("firm_profile_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function moveProfileItem(itemId: string, direction: Direction): Promise<{ ok: true }> {
  const db = await admin();
  const { data: current, error } = await db
    .from("firm_profile_items")
    .select("id, section_id")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!current) throw new Error("Bullet not found");

  const { data: siblings, error: sErr } = await db
    .from("firm_profile_items")
    .select("id, sort_order, created_at")
    .eq("section_id", current.section_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (sErr) throw new Error(sErr.message);

  const list = siblings ?? [];
  const idx = list.findIndex((i) => i.id === itemId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  const neighbour = list[swapIdx];
  if (idx < 0 || !neighbour) return { ok: true };

  const updates = list.map((s, i) => ({
    id: s.id,
    sort_order: i === idx ? swapIdx : i === swapIdx ? idx : i,
  }));
  for (const u of updates) {
    const { error: uErr } = await db
      .from("firm_profile_items")
      .update({ sort_order: u.sort_order })
      .eq("id", u.id);
    if (uErr) throw new Error(uErr.message);
  }
  return { ok: true };
}

/** Splits pasted text into one bullet per non-blank line, stripping list markers. */
export function parseBulkLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export async function bulkCreateProfileItems(
  sectionId: string,
  text: string,
): Promise<{ created: number }> {
  const lines = parseBulkLines(text);
  if (lines.length === 0) return { created: 0 };
  const start = await nextItemOrder(sectionId);
  const db = await admin();
  const { error } = await db
    .from("firm_profile_items")
    .insert(lines.map((body, i) => ({ section_id: sectionId, body, sort_order: start + i })));
  if (error) throw new Error(error.message);
  return { created: lines.length };
}

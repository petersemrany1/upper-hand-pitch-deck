import { supabase } from "@/integrations/supabase/client";

// Ordered list of training modules. Order = unlock order.
export const TRAINING_MODULES = [
  { slug: "product-knowledge", url: "/training/product-knowledge", title: "Product Knowledge" },
  { slug: "audience", url: "/training/audience", title: "Understanding Who You Are Talking To" },
  { slug: "consultation-videos", url: "/training/consultation-videos", title: "What to Expect at the Consultation" },
  { slug: "read-along", url: "/training/read-along", title: "Read Along" },
  { slug: "sales-framework", url: "/training/sales-framework", title: "Sales Framework" },
  { slug: "sales-call-example", url: "/training/sales-call-example", title: "Sales Call Example" },
  { slug: "knowledge-quiz", url: "/training/knowledge-quiz", title: "Knowledge Quiz" },
  { slug: "platform", url: "/training/platform", title: "Platform Training" },
  { slug: "ai", url: "/training/ai", title: "AI Training" },
] as const;

export type ModuleSlug = (typeof TRAINING_MODULES)[number]["slug"];

export type ModuleStatus = {
  completed: Record<string, boolean>;
  quizPassed: boolean;
  isAdmin: boolean;
};

export async function loadIsAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const email = user.email ?? "";
  const { data } = await supabase
    .from("sales_reps")
    .select("role")
    .or(`id.eq.${user.id},email.eq.${email}`)
    .limit(1)
    .maybeSingle();
  return (data as any)?.role === "admin";
}

export async function loadModuleStatus(): Promise<ModuleStatus> {
  const empty: ModuleStatus = { completed: {}, quizPassed: false, isAdmin: false };
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return empty;

  const [{ data: progress }, { data: quiz }, isAdmin] = await Promise.all([
    supabase
      .from("rep_module_progress")
      .select("module_slug, module_complete")
      .eq("user_id", uid),
    supabase
      .from("rep_quiz_progress")
      .select("passed")
      .eq("user_id", uid)
      .maybeSingle(),
    loadIsAdmin(),
  ]);

  const completed: Record<string, boolean> = {};
  for (const row of progress ?? []) {
    if ((row as any).module_complete) completed[(row as any).module_slug] = true;
  }
  // Quiz passing = knowledge-quiz module complete (in addition to any row that exists).
  if (quiz?.passed) completed["knowledge-quiz"] = true;
  return { completed, quizPassed: !!quiz?.passed, isAdmin };
}

// Returns the slugs that are unlocked given the current completion map.
export function unlockedSlugs(status: ModuleStatus): Set<string> {
  const unlocked = new Set<string>();
  // Admins have everything unlocked.
  if (status.isAdmin) {
    for (const m of TRAINING_MODULES) unlocked.add(m.slug);
    return unlocked;
  }
  // first module always unlocked
  for (let i = 0; i < TRAINING_MODULES.length; i++) {
    if (i === 0) {
      unlocked.add(TRAINING_MODULES[i].slug);
      continue;
    }
    const prev = TRAINING_MODULES[i - 1].slug;
    if (status.completed[prev]) {
      unlocked.add(TRAINING_MODULES[i].slug);
    } else {
      break;
    }
  }
  return unlocked;
}

export function previousModule(slug: ModuleSlug) {
  const idx = TRAINING_MODULES.findIndex((m) => m.slug === slug);
  if (idx <= 0) return null;
  return TRAINING_MODULES[idx - 1];
}

export function nextModule(slug: ModuleSlug) {
  const idx = TRAINING_MODULES.findIndex((m) => m.slug === slug);
  if (idx < 0 || idx >= TRAINING_MODULES.length - 1) return null;
  return TRAINING_MODULES[idx + 1];
}

export async function markModuleComplete(slug: ModuleSlug): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;

  const { data: existing } = await supabase
    .from("rep_module_progress")
    .select("id, module_complete")
    .eq("user_id", uid)
    .eq("module_slug", slug)
    .maybeSingle();

  if (existing?.module_complete) return true;

  const { error } = await supabase
    .from("rep_module_progress")
    .upsert(
      {
        user_id: uid,
        module_slug: slug,
        module_complete: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_slug" },
    );
  return !error;
}

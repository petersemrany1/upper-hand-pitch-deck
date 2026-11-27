// Ported from the Legal app (family-law-floater/src/lib/training/registry.ts). Re-run the port script to refresh.
// The Training Journey. Order = unlock order. This is the ONLY copy of the module
// list: the journey page, the module gates and the server completion check all read it.
// Pure data and pure functions, so client and server code can both import it.

import { isVideoModule, MODULE_VIDEOS } from "./media";

export const TRAINING_MODULES = [
  {
    slug: "product-knowledge",
    url: "/training/product-knowledge",
    title: "Product Knowledge",
    desc: "What Legal Group does, why it matters, our values, and the core of family law: how a separation gets sorted, what it costs, how people fund it — and the one rule you never break.",
  },
  {
    slug: "audience",
    url: "/training/audience",
    title: "Understanding Who You Are Talking To",
    desc: "Who you're calling, what you'll hear on the phone, and how to triage and vet each caller.",
  },
  {
    slug: "consultation-videos",
    url: "/training/consultation-videos",
    title: "What to Expect at the Consultation",
    desc: "Watch these videos so you know exactly what a client experiences at their first consultation with a family lawyer.",
  },
  {
    slug: "read-along",
    url: "/training/read-along",
    title: "Read Along",
    desc: "Family-law knowledge — the full written deep-dive to read alongside the videos.",
  },
  {
    slug: "sales-framework",
    url: "/training/sales-framework",
    title: "Sales Framework",
    desc: "The 9-stage sales framework — from the Opening through to Funding & Final Checks.",
  },
  {
    slug: "sales-call-example",
    url: "/training/sales-call-example",
    title: "Sales Call Example",
    desc: "Listen to model sales calls and study the structure step by step.",
  },
  {
    slug: "knowledge-quiz",
    url: "/training/knowledge-quiz",
    title: "Knowledge Quiz",
    // {total} is filled in from the size of the question bank.
    desc: "{total}-question gate covering framework, product, skills and process. Pass {total}/{total} to unlock the rest of your training.",
  },
  {
    slug: "platform",
    url: "/training/platform",
    title: "Platform Training",
    desc: "Tour of the portal: leads, the Sales Call cockpit, callbacks, Inbox, booking + deposit, handover and the leaderboard.",
  },
  {
    slug: "call-coaching",
    url: "/training/call-coaching",
    title: "Before You Practice — Call Coaching",
    desc: "Watch the full call coaching video before you unlock AI practice calls.",
  },
  {
    slug: "ai",
    url: "/training/ai",
    title: "AI Training",
    desc: "Practise live calls against our AI clients — with the 9-stage cockpit beside you.",
  },
] as const;

export type TrainingModule = (typeof TRAINING_MODULES)[number];
export type ModuleSlug = TrainingModule["slug"];
export const MODULE_SLUGS = TRAINING_MODULES.map((m) => m.slug) as [ModuleSlug, ...ModuleSlug[]];

export type ModuleStatus = {
  completed: Record<string, boolean>;
  quizPassed: boolean;
  isAdmin: boolean;
};

export function moduleBySlug(slug: ModuleSlug): TrainingModule {
  return TRAINING_MODULES.find((m) => m.slug === slug)!;
}

/** 1-based position, for "Module {n}" copy. Never hard-code module numbers. */
export function moduleNumber(slug: ModuleSlug): number {
  return TRAINING_MODULES.findIndex((m) => m.slug === slug) + 1;
}

/**
 * Modules whose content isn't made yet — a video module with no video. Reps can't complete
 * them, so they don't block the modules after them (Peter, 11 Oct 2026). Once the video is
 * added the module is required again, and the modules after it lock until it's watched.
 */
export function awaitingContent(): Set<ModuleSlug> {
  return new Set(MODULE_SLUGS.filter((s) => isVideoModule(s) && MODULE_VIDEOS[s].length === 0));
}

/** Whether a module lets the next one open: completed, or still waiting for its content. */
export function passes(
  status: ModuleStatus,
  slug: ModuleSlug,
  skippable: ReadonlySet<string> = awaitingContent(),
): boolean {
  return status.completed[slug] === true || skippable.has(slug);
}

/** Slugs the user may open: admins see everything; otherwise strictly in order. */
export function unlockedSlugs(
  status: ModuleStatus,
  skippable: ReadonlySet<string> = awaitingContent(),
): Set<string> {
  const unlocked = new Set<string>();
  if (status.isAdmin) {
    for (const m of TRAINING_MODULES) unlocked.add(m.slug);
    return unlocked;
  }
  for (let i = 0; i < TRAINING_MODULES.length; i++) {
    if (i === 0 || passes(status, TRAINING_MODULES[i - 1]!.slug, skippable)) {
      unlocked.add(TRAINING_MODULES[i]!.slug);
    } else {
      break; // strictly linear: a completed module after a gap stays locked
    }
  }
  return unlocked;
}

export function previousModule(slug: ModuleSlug): TrainingModule | null {
  const idx = TRAINING_MODULES.findIndex((m) => m.slug === slug);
  if (idx <= 0) return null;
  return TRAINING_MODULES[idx - 1] ?? null;
}

export function nextModule(slug: ModuleSlug): TrainingModule | null {
  const idx = TRAINING_MODULES.findIndex((m) => m.slug === slug);
  if (idx < 0 || idx >= TRAINING_MODULES.length - 1) return null;
  return TRAINING_MODULES[idx + 1] ?? null;
}

/** The first unlocked module that isn't complete or skippable — the journey's "Current" card. */
export function currentSlug(
  status: ModuleStatus,
  skippable: ReadonlySet<string> = awaitingContent(),
): ModuleSlug | null {
  const unlocked = unlockedSlugs(status, skippable);
  const m = TRAINING_MODULES.find(
    (x) => unlocked.has(x.slug) && !status.completed[x.slug] && !skippable.has(x.slug),
  );
  return m?.slug ?? null;
}

/**
 * The module a rep has to finish before they can open `slug` — the first one in the chain
 * that's open but not done (never one still waiting for its content). Null if `slug` is open.
 */
export function blockingModule(
  status: ModuleStatus,
  slug: ModuleSlug,
  skippable: ReadonlySet<string> = awaitingContent(),
): TrainingModule | null {
  if (unlockedSlugs(status, skippable).has(slug)) return null;
  const current = currentSlug(status, skippable);
  return current ? moduleBySlug(current) : previousModule(slug);
}

/** Fill the {total} placeholder in a card description. */
export function moduleDesc(m: TrainingModule, quizTotal: number): string {
  return m.desc.replaceAll("{total}", String(quizTotal));
}

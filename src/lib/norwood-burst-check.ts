import { z } from "zod";
import type { NorwoodView } from "./norwood-assessment";
import { VIEW_CORRECTIONS, type NorwoodPhotoCheck } from "./norwood-photo-check";

export const BURST_PROBLEMS = ["none", "no_head", "wrong_angle", "hairline_cut_off", "hair_covering", "too_dark", "blurred", "too_far"] as const;
const frameSchema = z.object({ head_present: z.boolean(), requested_view_visible: z.boolean(), problem: z.enum(BURST_PROBLEMS) }).strict();
const schema = z.object({ frames: z.array(frameSchema).min(1).max(3), best_frame: z.number().int().min(0).max(2).nullable() }).strict();
export type BurstCheck = NorwoodPhotoCheck & { selectedIndex: number | null; problem: typeof BURST_PROBLEMS[number] };
export function parseNorwoodBurstCheck(raw: string, view: NorwoodView, count: number): BurstCheck {
  const result = schema.parse(JSON.parse(raw));
  if (result.frames.length !== count) throw new Error("Mismatched frame count");
  const usable = (frame: z.infer<typeof frameSchema>) => frame.head_present && frame.requested_view_visible && frame.problem === "none";
  if (result.best_frame !== null) {
    const frame = result.frames[result.best_frame];
    if (!frame || !usable(frame)) throw new Error("Selected frame is not usable");
    return { ready: true, selectedIndex: result.best_frame, problem: "none", message: "Photo saved" };
  }
  if (result.frames.some(usable)) throw new Error("A usable frame was omitted");
  // Prefer a relevant photographed head over a momentary empty frame when
  // choosing the correction. Do not send free-form model prose to the patient.
  const frame = result.frames.find(f => f.head_present && f.requested_view_visible) ?? result.frames.find(f => f.head_present) ?? result.frames[0];
  const problem = !frame.head_present ? "no_head" : frame.problem === "none" ? "wrong_angle" : frame.problem;
  const messages = {
    none: "", no_head: "Bring your head into the picture.", wrong_angle: VIEW_CORRECTIONS[view],
    hairline_cut_off: "Move the phone further away so your whole hairline fits.",
    hair_covering: "Push your hair back so we can see the hairline.",
    too_dark: "Face a window or a brighter light.", blurred: "Keep the phone still until the timer finishes.",
    too_far: "Bring the phone a little closer to your head.",
  };
  return { ready: false, selectedIndex: null, problem, message: messages[problem] };
}

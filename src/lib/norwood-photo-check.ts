import { z } from "zod";
import type { NorwoodView } from "./norwood-assessment";

const checkSchema = z.object({
  head_present: z.boolean(),
  requested_view_visible: z.boolean(),
  quality: z.enum(["clear", "dark", "blurry", "obscured", "too_far"]),
}).strict();
export type NorwoodPhotoCheck = { ready: boolean; message: string; reviewIndex?: number };
export const VIEW_CORRECTIONS: Record<NorwoodView, string> = {
  front: "Show your hairline and both temples. Push your hair back.",
  top: "Lift the phone above your forehead and aim down at the top.",
  crown: "Move the phone above and slightly behind your head. Your advisor will guide you.",
  left: "Turn your nose to your right. Show your left temple and ear.",
  right: "Turn your nose to your left. Show your right temple and ear.",
};
export function parseNorwoodPhotoCheck(raw: string, view: NorwoodView): NorwoodPhotoCheck {
  const check = checkSchema.parse(JSON.parse(raw));
  if (!check.head_present) return { ready: false, message: "Move your head into the picture." };
  if (!check.requested_view_visible) return { ready: false, message: VIEW_CORRECTIONS[view] };
  const messages = { dark: "Move into brighter light.", blurry: "Hold still and wipe the camera lens.", obscured: "Move your hair or hand away from the area shown.", too_far: "Bring the phone a little closer to your head." };
  return check.quality === "clear" ? { ready: true, message: "Head in position. Hold still." } : { ready: false, message: messages[check.quality] };
}

export function norwoodSms(firstName: string | null | undefined, link: string) {
  const name = firstName?.trim().replace(/\s+/g, " ").slice(0, 60) || "there";
  return `Hi ${name} please see link below for our ai norwood scale scanner ${link}`;
}

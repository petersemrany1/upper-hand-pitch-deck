import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertNorwoodPreviewRequest } from "@/lib/norwood-preview-access";
import { NORWOOD_MAX_PHOTO_BYTES, NORWOOD_VIEWS, hasAllNorwoodViews } from "@/lib/norwood-assessment";
import { bookingActor } from "./booking-access.server";
import { configuredNorwoodModel, requestNorwoodEstimate } from "./norwood-inference.server";

function previewOnly() {
  setResponseHeader("Cache-Control", "no-store, private");
  const request = getRequest();
  assertNorwoodPreviewRequest(request.url, request.headers.get("origin"));
}
export const getNorwoodPreviewReadiness = createServerFn({ method: "POST" }).handler(() => {
  previewOnly();
  return { aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY) };
});

export const analyseNorwoodPreview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ photos: z.array(z.object({ view: z.enum(NORWOOD_VIEWS), base64: z.string().min(4).max(Math.ceil(NORWOOD_MAX_PHOTO_BYTES / 3) * 4) }).strict()).length(5), consent: z.literal(true) }).strict())
  .handler(async ({ data, context }) => {
    previewOnly();
    // Read-only access check against existing staff auth. No lead, storage or SMS writes.
    await bookingActor(context.supabase);
    if (!process.env.ANTHROPIC_API_KEY) return { ok: false as const, error: "The preview needs the server-side Anthropic connection before it can estimate." };
    if (!hasAllNorwoodViews(data.photos.map(p => p.view))) return { ok: false as const, error: "All five different angles are required." };
    const hashes = new Set<string>();
    for (const photo of data.photos) {
      const bytes = Buffer.from(photo.base64, "base64");
      if (bytes.length > NORWOOD_MAX_PHOTO_BYTES || bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes.toString("base64") !== photo.base64) return { ok: false as const, error: "Please use the guided camera or JPEG photos." };
      hashes.add(createHash("sha256").update(bytes).digest("hex"));
    }
    if (hashes.size !== 5) return { ok: false as const, error: "Use a different photo for each angle." };
    try {
      const result = await requestNorwoodEstimate(data.photos, process.env.ANTHROPIC_API_KEY, fetch, configuredNorwoodModel());
      return { ok: true as const, data: result };
    } catch {
      return { ok: false as const, error: "The AI could not return a supported estimate. Check the five angles and try again." };
    }
  });

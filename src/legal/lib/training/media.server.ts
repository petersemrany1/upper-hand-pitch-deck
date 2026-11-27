// Ported from the Legal app (family-law-floater/src/lib/training/media.server.ts). Re-run the port script to refresh.
// Admin uploads of training videos to the private training-media bucket. The browser (or a
// command line) uploads straight to storage with a short-lived signed link, so large video
// files never pass through the server.

import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";

/** A one-off link that lets the caller upload (or replace) one video file. */
export async function trainingVideoUploadLink(path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from("training-media")
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message ?? "Couldn't create an upload link.");
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

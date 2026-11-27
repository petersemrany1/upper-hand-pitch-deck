// Ported from the Legal app (family-law-floater/src/components/settings/training-videos-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { supabase } from "@/legal/integrations/supabase/client";
import { trainingVideoUploadLinkFn } from "@/legal/lib/training/training.functions";

/**
 * Admin: upload or replace a training video (an MP4) in the private training-media bucket,
 * as videos/<name>.mp4. The file goes straight to storage with a one-off signed link.
 */
export function TrainingVideosCard() {
  const getLink = useServerFn(trainingVideoUploadLinkFn);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const valid = /^[a-z0-9-]{1,60}$/.test(name.trim());

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose an MP4 first.");
      const { path, token } = await getLink({ data: { name: name.trim() } });
      const { error } = await supabase.storage
        .from("training-media")
        .uploadToSignedUrl(path, token, file, { contentType: "video/mp4" });
      if (error) throw new Error(error.message);
      return path;
    },
    onSuccess: (path) => toast.success(`Uploaded ${path}`),
    onError: (e: Error) => toast.error(e.message),
  });

  const linkOnly = useMutation({
    mutationFn: () => getLink({ data: { name: name.trim() } }),
    onSuccess: (r) => setLink(r.signedUrl),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training videos</CardTitle>
        <CardDescription>
          Upload or replace a training video. It's stored privately as videos/[name].mp4 and only
          staff can play it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
          <Input
            placeholder="Name, e.g. module-2b"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Video name"
          />
          <Input
            type="file"
            accept="video/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-label="Video file"
          />
          <Button onClick={() => upload.mutate()} disabled={!valid || !file || upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => linkOnly.mutate()}
          disabled={!valid || linkOnly.isPending}
        >
          Get a one-off upload link instead
        </Button>
        {link ? (
          <Textarea
            readOnly
            rows={3}
            value={link}
            aria-label="Upload link"
            className="font-mono text-xs"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

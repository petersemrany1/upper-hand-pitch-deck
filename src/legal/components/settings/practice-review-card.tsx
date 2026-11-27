// Ported from the Legal app (family-law-floater/src/components/settings/practice-review-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PracticeAudio } from "@/legal/components/training/practice-audio";
import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Textarea } from "@/legal/components/ui/textarea";
import { supabase } from "@/legal/integrations/supabase/client";
import { formatSydney } from "@/legal/lib/timezone";
import { PERSONAS } from "@/legal/lib/training/practice";
import { reviewPracticeCallFn } from "@/legal/lib/training/training.functions";

type Row = {
  id: string;
  auth_user_id: string;
  persona: string | null;
  started_at: string | null;
  duration_seconds: number;
  audio_path: string | null;
  transcript: unknown;
  review_status: string | null;
  review_note: string | null;
  repName: string;
};

async function loadSubmitted(): Promise<Row[]> {
  const [calls, staff] = await Promise.all([
    supabase
      .from("practice_call_recordings")
      .select(
        "id, auth_user_id, persona, started_at, duration_seconds, audio_path, transcript, review_status, review_note",
      )
      .eq("submitted_as_best", true)
      .order("started_at", { ascending: false }),
    supabase.from("sales_reps").select("user_id, name, email"),
  ]);
  if (calls.error) throw calls.error;
  const names = new Map((staff.data ?? []).map((s) => [s.user_id, s.name || s.email || "Unnamed"]));
  return (calls.data ?? []).map((c) => ({ ...c, repName: names.get(c.auth_user_id) ?? "Unknown" }));
}

const mins = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Admin: each rep's "best" AI practice call, to clear them for live calls or send them back. */
export function PracticeReviewCard() {
  const queryClient = useQueryClient();
  const review = useServerFn(reviewPracticeCallFn);
  const rows = useQuery({ queryKey: ["practice-review"], queryFn: loadSubmitted });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: (v: {
      callId: string;
      status: "cleared" | "keep_practising";
      current: string | null;
    }) =>
      // Untouched note box = keep the note already saved.
      review({
        data: { callId: v.callId, status: v.status, note: notes[v.callId] ?? v.current ?? "" },
      }),
    onSuccess: () => {
      toast.success("Review saved");
      void queryClient.invalidateQueries({ queryKey: ["practice-review"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice calls to review</CardTitle>
        <CardDescription>
          Each rep's "best" AI practice call. Listen, then mark them Cleared to call or Keep
          practising — they see your note on their AI Training page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.error ? (
          <p className="text-sm text-destructive">
            Couldn't load practice calls — has the practice-calls migration been run? (
            {(rows.error as Error).message})
          </p>
        ) : (rows.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No practice calls submitted yet.</p>
        ) : (
          (rows.data ?? []).map((r) => {
            const transcript = Array.isArray(r.transcript)
              ? (r.transcript as { who: string; text: string }[])
              : [];
            return (
              <div key={r.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold">{r.repName}</span>
                  <span className="text-muted-foreground">
                    with {PERSONAS.find((p) => p.id === r.persona)?.firstName ?? "AI client"} ·{" "}
                    {r.started_at ? formatSydney(r.started_at) : ""} · {mins(r.duration_seconds)}
                  </span>
                  {r.review_status ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${
                        r.review_status === "cleared" ? "bg-green-600" : "bg-amber-500"
                      }`}
                    >
                      {r.review_status === "cleared" ? "Cleared to call" : "Keep practising"}
                    </span>
                  ) : null}
                </div>
                {r.audio_path ? <PracticeAudio path={r.audio_path} /> : null}
                {transcript.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setOpenTranscript(openTranscript === r.id ? null : r.id)}
                    className="text-xs font-bold text-primary"
                  >
                    {openTranscript === r.id ? "Hide transcript" : "Show transcript"}
                  </button>
                ) : null}
                {openTranscript === r.id ? (
                  <div className="max-h-72 space-y-1 overflow-y-auto rounded-md bg-muted/30 p-2 text-[13px]">
                    {transcript.map((t, i) => (
                      <p key={i}>
                        <span className="font-bold">{t.who === "rep" ? "Rep" : "Client"}:</span>{" "}
                        {t.text}
                      </p>
                    ))}
                  </div>
                ) : null}
                <Textarea
                  rows={2}
                  placeholder="Note for the rep (optional)"
                  value={notes[r.id] ?? r.review_note ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ callId: r.id, status: "cleared", current: r.review_note })
                    }
                  >
                    Cleared to call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({
                        callId: r.id,
                        status: "keep_practising",
                        current: r.review_note,
                      })
                    }
                  >
                    Keep practising
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

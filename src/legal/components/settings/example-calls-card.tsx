// Ported from the Legal app (family-law-floater/src/components/settings/example-calls-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { formatSpeakerTranscript } from "@/legal/lib/client-intel-evidence";
import {
  exampleCallTranscriptPartFn,
  publishExampleCallAudioFn,
} from "@/legal/lib/training/training.functions";

type TimedText = { speaker: string; text: string; start: number; end: number };

/** "12.5-20" per line → silence ranges in seconds. */
function parseRanges(text: string) {
  return text
    .split(/\n|,/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/.exec(l);
      if (!m) throw new Error(`Can't read "${l}" — use start-end in seconds, e.g. 312.5-318`);
      return { start: Number(m[1]), end: Number(m[2]) };
    });
}

/**
 * Admin: prepare a real call for the Sales Call Example module. Read its timed transcript,
 * then publish a cleaned copy with sensitive moments silenced. The original is never changed.
 */
export function ExampleCallsCard() {
  const getPart = useServerFn(exampleCallTranscriptPartFn);
  const publish = useServerFn(publishExampleCallAudioFn);
  const [callId, setCallId] = useState("");
  const [exampleId, setExampleId] = useState("");
  const [ranges, setRanges] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [progress, setProgress] = useState("");

  const load = useMutation({
    mutationFn: async (source: { callRecordId: string } | { exampleId: string }) => {
      // One ~10-minute piece per request, so no request runs into the gateway's time limit.
      const segments: TimedText[] = [];
      const words: TimedText[] = [];
      let parts = 1;
      for (let part = 0; part < parts; part++) {
        setProgress(`Transcribing piece ${part + 1}${part ? ` of ${parts}` : ""}…`);
        const r = await getPart({ data: { ...source, part } });
        parts = r.parts;
        segments.push(...r.segments);
        words.push(...r.words);
      }
      if (!segments.length) throw new Error("No speech could be heard in the recording");
      const byTime = (a: TimedText, b: TimedText) =>
        a.start - b.start || a.end - b.end || a.speaker.localeCompare(b.speaker);
      // Every word's own timing goes under the lines, for picking exactly what to silence.
      const wordLines = words
        .sort(byTime)
        .map((w) => `${w.start.toFixed(2)}–${w.end.toFixed(2)} ${w.speaker}: ${w.text}`);
      return [
        formatSpeakerTranscript({ segments: segments.sort(byTime) }),
        "",
        "WORD TIMINGS",
        ...wordLines,
      ].join("\n");
    },
    onSuccess: (text, source) => {
      setTranscript(text);
      toast.success(
        "exampleId" in source ? "Transcribed the published copy" : "Transcribed with timings",
      );
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setProgress(""),
  });

  const send = useMutation({
    mutationFn: () =>
      publish({
        data: {
          callRecordId: callId.trim(),
          exampleId: exampleId.trim(),
          silence: parseRanges(ranges),
        },
      }),
    onSuccess: (r) => {
      setResult(JSON.stringify(r));
      toast.success("Cleaned audio published");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training example calls</CardTitle>
        <CardDescription>
          For the Sales Call Example module. Transcribe a call with word timings, then publish a
          cleaned copy with card numbers, names and addresses silenced. The original recording is
          never changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Call record id"
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
            aria-label="Call record id"
          />
          <Button
            onClick={() => load.mutate({ callRecordId: callId.trim() })}
            disabled={!callId.trim() || load.isPending}
          >
            {load.isPending ? "Transcribing…" : "Get timed transcript"}
          </Button>
        </div>
        {progress ? <p className="text-xs text-muted-foreground">{progress}</p> : null}
        {transcript ? (
          <Textarea
            readOnly
            rows={10}
            value={transcript}
            aria-label="Timed transcript"
            className="font-mono text-xs"
          />
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
          <Input
            placeholder="Example id, e.g. call-a"
            value={exampleId}
            onChange={(e) => setExampleId(e.target.value)}
            aria-label="Example id"
          />
          <Textarea
            rows={3}
            placeholder={"Moments to silence, in seconds, one per line:\n312.5-318\n640-655"}
            value={ranges}
            onChange={(e) => setRanges(e.target.value)}
            aria-label="Silence ranges"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (
                !ranges.trim() &&
                !window.confirm(
                  "Publish this call with nothing silenced? Every rep will be able to hear all of it.",
                )
              ) {
                return;
              }
              send.mutate();
            }}
            disabled={!callId.trim() || !exampleId.trim() || send.isPending}
          >
            {send.isPending ? "Publishing…" : "Publish cleaned audio"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => load.mutate({ exampleId: exampleId.trim() })}
            disabled={!exampleId.trim() || load.isPending}
          >
            Transcribe the published copy
          </Button>
        </div>
        {result ? (
          <p
            className="break-all font-mono text-xs text-muted-foreground"
            aria-label="Publish result"
          >
            {result}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

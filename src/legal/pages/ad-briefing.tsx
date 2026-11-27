// Ported from the Legal app (family-law-floater/src/routes/_authenticated/ad-briefing.tsx). Re-run the port script to refresh.
import { redirect } from "@/legal/runtime/router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, Clock, FileText } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import {
  getAdBriefing,
  saveAdBriefingReport,
  saveAdBriefingSettings,
  testAdBriefing,
  connectAdBriefingVoice,
} from "@/legal/lib/ad-briefing.functions";
import { parseBriefingSettings, type AdReport } from "@/legal/lib/ad-briefing";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { AdBriefingPage as LegalPage };
export const Route = legalRoute({
  beforeLoad: ({ context }) => {
    if (!context.role.isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Your daily ad briefing — Bold" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdBriefingPage,
});

function AdBriefingPage() {
  const get = useServerFn(getAdBriefing);
  const saveSettings = useServerFn(saveAdBriefingSettings);
  const saveReport = useServerFn(saveAdBriefingReport);
  const test = useServerFn(testAdBriefing);
  const connectVoice = useServerFn(connectAdBriefingVoice);
  const client = useQueryClient();
  const state = useQuery({ queryKey: ["ad-briefing"], queryFn: () => get() });
  const [recipient, setRecipient] = useState<string | null>(null);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [reportJson, setReportJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setFeedback("");
    try {
      await fn();
      await client.invalidateQueries({ queryKey: ["ad-briefing"] });
      setFeedback(message);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't complete that action.");
    } finally {
      setBusy(false);
    }
  }
  const data = state.data;
  const settings = data?.settings;
  const phone = recipient ?? settings?.recipient ?? "";
  const from = callerId ?? settings?.caller_id ?? data?.numbers[0]?.number ?? "";
  const save = async (enabled: boolean) => {
    const input = parseBriefingSettings({ recipient: phone, caller_id: from, enabled });
    await saveSettings({ data: input });
    setRecipient(input.recipient);
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 overflow-y-auto p-5 md:p-8">
      <header>
        <p className="text-sm font-semibold text-primary">BOLD • PRIVATE BRIEFING</p>
        <h1 className="mt-2 text-3xl font-bold">Your ads. Your morning call.</h1>
        <p className="mt-2 text-muted-foreground">
          Fatigue and lead-cost alerts, with a clear action for each ad.
        </p>
      </header>
      {state.isLoading && <p>Loading your briefing…</p>}
      {state.error && <p role="alert">{state.error.message}</p>}
      {feedback && (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {feedback}
        </p>
      )}
      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-5" /> Morning calls{" "}
                {settings?.enabled ? "are on" : "are off"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="flex items-center gap-2 text-sm">
                <Clock className="size-4" /> Checked daily; calls at 9am Sydney time only when there
                is a new ad action.
              </p>
              <label className="block text-sm">
                Your mobile
                <Input
                  aria-label="Your mobile"
                  className="mt-1"
                  value={phone}
                  type="tel"
                  autoComplete="tel"
                  placeholder="04xx xxx xxx"
                  onChange={(event) => setRecipient(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                Calling number
                <select
                  aria-label="Calling number"
                  className="mt-1 block w-full rounded-md border bg-background p-2"
                  value={from}
                  onChange={(event) => setCallerId(event.target.value)}
                >
                  <option value="">Choose an existing number</option>
                  {data.numbers.map(({ number }) => (
                    <option value={number} key={number}>
                      {number}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-muted-foreground">
                First, a quick “Is now a good time?” Say yes, have a morning catch-up, then hear the
                key ad results and what to watch in one or two sentences. Then questions, breakfast
                chat and plenty of cheeky banter. Say “be serious” to get straight to business, or
                no if you're busy.
              </p>
              <p className="text-sm text-muted-foreground">
                One morning call, plus one callback after five minutes if there is no answer (allow
                up to one extra minute). Recognised voicemail greetings also trigger the callback.
                Each call lasts up to five minutes. The assistant gives advice and cannot change
                your ads. No call recordings; speech is transcribed for the conversation.
              </p>
              <p className="text-sm text-muted-foreground">
                Calls use your existing Twilio, ElevenLabs and Anthropic accounts and incur usage
                charges.{" "}
                {settings?.speech_engine_id
                  ? "ElevenLabs provides Haboob's private voice and speech recognition."
                  : "Your voice is generated by ElevenLabs through Twilio, with Google speech recognition."}
                Your briefing and conversation are processed by these providers. The 8am review
                needs Codex and your computer running. Missing reviews and unchanged results do not
                trigger a call; access problems appear in the written monitor.
              </p>
              <p className="text-sm text-muted-foreground">
                {settings?.speech_engine_id
                  ? "Voice: Haboob — Lebanese Voice 2. Mature, gruff and lively, with quick replies and plenty of banter."
                  : "Voice: Lee, a mature Australian male. Short, streamed replies with reduced sensitivity to background noise and brief acknowledgements."}
              </p>
              {!data.streamingReady && (
                <p role="status">
                  The ElevenLabs voice upgrade is awaiting activation. Calls are paused until it's
                  ready.
                </p>
              )}
              {!data.ready && <p role="alert">A calling or AI credential is missing.</p>}
              <div className="flex flex-wrap gap-2">
                {!settings?.speech_engine_id && data.privateVoiceReady && (
                  <Button
                    variant="outline"
                    disabled={busy || !settings}
                    onClick={() =>
                      action(
                        () => connectVoice(),
                        "Haboob Voice 2 is connected. You can now test the call.",
                      )
                    }
                  >
                    Connect Haboob Voice 2
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={busy || !phone || !from}
                  onClick={() =>
                    action(() => save(settings?.enabled ?? false), "Call settings saved.")
                  }
                >
                  Save call settings
                </Button>
                <Button
                  disabled={
                    busy || !settings || !data.ready || (!data.streamingReady && !settings.enabled)
                  }
                  onClick={() =>
                    action(
                      () => save(!settings?.enabled),
                      settings?.enabled
                        ? "Morning calls are off."
                        : "Ad action calls are on for 9am Sydney time.",
                    )
                  }
                >
                  {settings?.enabled ? "Turn off morning calls" : "Turn on morning calls"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !settings || !data.ready || !data.streamingReady}
                  onClick={() =>
                    action(async () => {
                      const result = await test();
                      if (result.status !== "queued")
                        throw new Error(
                          "Today's test for this voice version was already attempted. Check the call history.",
                        );
                    }, "Test call queued. Answer your mobile and say yes when asked if it's a good time.")
                  }
                >
                  Make a test call
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" /> Latest review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.report ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Review for {data.report.report_date} · data checked{" "}
                    {new Date(data.report.collected_at).toLocaleString("en-AU", {
                      timeZone: "Australia/Sydney",
                    })}{" "}
                    Sydney
                  </p>
                  <p className="whitespace-pre-wrap">{data.report.summary}</p>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">
                      Read the full review
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">
                      {data.report.report}
                    </pre>
                  </details>
                </>
              ) : (
                <p className="text-muted-foreground">No review has been saved yet.</p>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-medium">Update the review</summary>
                <p className="my-2 text-sm text-muted-foreground">
                  For the review automation. Include report_date, collected_at, summary and report.
                  Only aggregate advertising data; no lead details.
                </p>
                <Textarea
                  aria-label="Daily review JSON"
                  className="min-h-40"
                  value={reportJson}
                  onChange={(event) => setReportJson(event.target.value)}
                />
                <Button
                  className="mt-2"
                  disabled={busy || !settings || !reportJson}
                  onClick={() =>
                    action(
                      () => saveReport({ data: JSON.parse(reportJson) as AdReport }),
                      "Fresh review saved for the morning call.",
                    )
                  }
                >
                  Save review
                </Button>
              </details>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent calls</CardTitle>
            </CardHeader>
            <CardContent>
              {data.calls.length ? (
                <ul className="space-y-3">
                  {data.calls.map((call) => (
                    <li
                      key={call.created_at}
                      className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm"
                    >
                      <span>
                        {call.call_date} ·{" "}
                        {call.kind === "test" ? "Connection test" : "Morning briefing"}
                      </span>
                      <span>
                        {call.status}
                        {call.duration !== null ? ` · ${call.duration}s` : ""}
                        {call.error_code ? ` · ${call.error_code}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No calls made yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

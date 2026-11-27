// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-conversation.ts). Re-run the port script to refresh.
import { conversationAction, MAX_QUESTIONS, type ConversationPhase } from "./ad-briefing.ts";
import type { BriefingReplyMode } from "./ad-briefing-voice.ts";

export type VoiceTurn = { question: string; answer: string };
type Dependencies = {
  send: (value: Record<string, unknown>) => void;
  reply: (
    history: VoiceTurn[],
    question: string,
    mode: BriefingReplyMode,
    signal: AbortSignal,
    finalTurn: boolean,
  ) => AsyncIterable<string>;
  save: (step: number, turn: VoiceTurn) => Promise<void>;
  afterSpeech: (text: string, done: () => void) => void;
};

export function createBriefingConversation(deps: Dependencies) {
  let phase: ConversationPhase = "permission";
  let step = 0;
  let finished = false;
  let revision = 0;
  let active: AbortController | undefined;
  let latestTurn: VoiceTurn | undefined;
  let latestStep = -1;
  const history: VoiceTurn[] = [];
  let saving = Promise.resolve();
  const save = (step: number, turn: VoiceTurn) => {
    const snapshot = { ...turn };
    saving = saving.then(() => deps.save(step, snapshot));
    return saving;
  };

  const end = () => {
    if (finished) return;
    finished = true;
    active?.abort();
    deps.send({ type: "end" });
  };
  const speak = (text: string) => deps.send({ type: "text", token: text, last: true });

  async function handle(message: Record<string, unknown>) {
    if (finished) return;
    if (message["type"] === "interrupt") {
      revision++;
      active?.abort();
      active = undefined;
      // Keep only what Twilio says was actually heard, not an unheard answer.
      if (latestTurn && typeof message["utteranceUntilInterrupt"] === "string") {
        latestTurn.answer = message["utteranceUntilInterrupt"].slice(0, 1600);
        await save(latestStep, latestTurn);
      }
      return;
    }
    const digit = message["type"] === "dtmf" ? String(message["digit"] ?? "") : "";
    if (!digit && (message["type"] !== "prompt" || message["last"] !== true)) return;
    const question =
      typeof message["voicePrompt"] === "string"
        ? message["voicePrompt"].trim().slice(0, 1500)
        : "";
    if (!question && !digit) return;
    const action = conversationAction(phase, question, digit);
    if (action === "finish") {
      end();
      return;
    }
    if (step > MAX_QUESTIONS) {
      end();
      return;
    }

    active?.abort();
    const mine = ++revision;
    const turnStep = step++;
    const finalTurn = turnStep === MAX_QUESTIONS;
    let answer: string;
    if (action === "clarify") {
      answer = phase === "permission" ? "Good time for a quick chat?" : "Sorry, what was that?";
    } else if (action === "wellbeing") {
      phase = "wellbeing";
      answer = "How are you this morning, anyway?";
    } else {
      const controller = new AbortController();
      active = controller;
      const turn: VoiceTurn = { question, answer: "" };
      const prior = history.map((item) => ({ ...item }));
      phase = "chat";
      latestTurn = turn;
      latestStep = turnStep;
      history.push(turn);
      try {
        // Stream each text delta as it arrives: no wait for the whole answer.
        for await (const token of deps.reply(
          prior,
          question,
          action,
          controller.signal,
          finalTurn,
        )) {
          if (finished || mine !== revision || controller.signal.aborted) return;
          turn.answer += token;
          deps.send({ type: "text", token, last: false });
        }
        if (finished || mine !== revision || controller.signal.aborted) return;
        deps.send({ type: "text", token: "", last: true });
        phase = "chat";
        active = undefined;
        await save(turnStep, turn);
        if (finalTurn) deps.afterSpeech(turn.answer, end);
      } catch {
        if (finished || mine !== revision || controller.signal.aborted) return;
        const failure = "Connection's playing up. Let's leave it there for now.";
        speak(failure);
        deps.afterSpeech(failure, end);
      }
      return;
    }
    const turn = { question: question || `[key ${digit}]`, answer };
    latestTurn = turn;
    latestStep = turnStep;
    history.push(turn);
    speak(answer);
    await save(turnStep, turn);
    if (finalTurn) deps.afterSpeech(answer, end);
  }
  return {
    handle,
    end,
    close: () => {
      finished = true;
      active?.abort();
    },
  };
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { Check, PhoneCall, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPageWrapper,
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});

const AGENT_ID = "agent_1301kt5fgx3ye9krpyc25900fy60";

const COLORS = {
  bg: "#f7f7f5",
  card: "#ffffff",
  line: "#ebebeb",
  text: "#111111",
  muted: "#111111",
  hint: "#111111",
  coral: "#f4522d",
  green: "#10b981",
  red: "#ef4444",
  gold: "#d97706",
};

type Stage = {
  stage_no: number;
  name: string;
  job: string;
  tag: string;
  band: string;
  slug: string;
  say_text: string | null;
  moves: unknown;
  move_on: string | null;
  never_do: string | null;
  gun_tell: string | null;
  notes: string | null;
};

function highlightTokens(text: string) {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{[^}]+\}\}$/.test(p) ? (
      <span key={i} style={{ background: "#fff1ee", color: COLORS.coral, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.coral, fontWeight: 600, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontSize: 32, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.01em", marginBottom: 16, lineHeight: 1.2 }}>
      {children}
    </h1>
  );
}

function PracticeCallPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startRef = useRef<number | null>(null);

  const [notes, setNotes] = useState({ whyNow: "", theirWords: "", objection: "" });

  const conversation = useConversation({
    onConnect: () => console.log("[practice] connected"),
    onDisconnect: () => console.log("[practice] disconnected"),
    onError: (e) => console.error("[practice] error", e),
  });

  const status = conversation.status;
  const isConnected = status === "connected";
  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("call_stages")
        .select("*")
        .gt("stage_no", 0)
        .order("stage_no", { ascending: true });
      if (error) console.error(error);
      else setStages((data ?? []) as Stage[]);
    })();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      startRef.current = null;
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    const t = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [isConnected]);

  const current = stages[idx];
  const moves = useMemo<string[]>(() => {
    const m = current?.moves;
    if (Array.isArray(m)) return m.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    return [];
  }, [current]);

  const startCall = async () => {
    setMicError(null);
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
    } catch (e) {
      console.error(e);
      setMicError(e instanceof Error ? e.message : "Couldn't access your microphone.");
    } finally {
      setStarting(false);
    }
  };

  const endCall = async () => {
    try { await conversation.endSession(); } catch (e) { console.error(e); }
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= stages.length) return;
    setCompleted((c) => {
      const n = new Set(c);
      if (i > idx && current) n.add(current.stage_no);
      return n;
    });
    setIdx(i);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row" style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100%", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* LEFT — vertical step nav */}
      <aside className="hidden md:flex flex-col flex-shrink-0" style={{ width: 220, background: "#ffffff", borderRight: `0.5px solid ${COLORS.line}` }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: COLORS.line }}>
          <Link to="/training" style={{ fontSize: 11, color: COLORS.hint, textDecoration: "none", display: "block", marginBottom: 8 }}>‹ Back to Training</Link>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: COLORS.hint, fontWeight: 500 }}>Practice Call</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text, marginTop: 4 }}>Roleplay with Dave</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {stages.map((s, i) => {
            const isActive = i === idx;
            const isDone = completed.has(s.stage_no);
            return (
              <button
                key={s.stage_no}
                onClick={() => setIdx(i)}
                className="w-full text-left flex items-center gap-3 transition-colors"
                style={{
                  padding: "10px 18px",
                  background: isActive ? "#f9f9f9" : "transparent",
                  borderLeft: isActive ? `3px solid ${COLORS.coral}` : "3px solid transparent",
                  border: "none",
                  borderRightWidth: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 16, height: 16,
                    background: isActive ? COLORS.coral : isDone ? "transparent" : "#ebebeb",
                  }}
                >
                  {isDone && !isActive && <Check className="h-3 w-3" style={{ color: COLORS.muted }} />}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "0.04em",
                  color: isActive ? COLORS.text : isDone ? COLORS.muted : COLORS.hint,
                  textTransform: "uppercase",
                }}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CENTER */}
      <main className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center px-6 py-[60px]">
        <div className="w-full" style={{ maxWidth: 640 }}>
          {micError && (
            <div style={{ marginBottom: 24, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>
              {micError}
            </div>
          )}

          {current ? (
            <>
              <Eyebrow>Stage {current.stage_no} — {current.tag}</Eyebrow>
              <StepHeading>{current.name}</StepHeading>
              <p style={{ color: COLORS.muted, fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>{current.job}</p>

              {current.say_text && (
                <div style={{ background: "#fafaf9", border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.coral}`, borderRadius: 8, padding: "18px 20px", marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.coral, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                    Say it like this
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.6, color: COLORS.text, whiteSpace: "pre-wrap" }}>
                    {highlightTokens(current.say_text)}
                  </div>
                </div>
              )}

              {moves.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.hint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                    Moves
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: COLORS.text, fontSize: 14, lineHeight: 1.7 }}>
                    {moves.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                {current.move_on && (
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Move on when</div>
                    <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.5 }}>{current.move_on}</div>
                  </div>
                )}
                {current.never_do && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Never</div>
                    <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>{current.never_do}</div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: `1px solid ${COLORS.line}` }}>
                <button
                  onClick={() => goTo(idx - 1)}
                  disabled={idx === 0}
                  style={{ background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, color: idx === 0 ? "#c4c4c4" : COLORS.text, cursor: idx === 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  ‹ Previous
                </button>
                <div style={{ fontSize: 12, color: COLORS.hint }}>Stage {idx + 1} of {stages.length}</div>
                <button
                  onClick={() => goTo(idx + 1)}
                  disabled={idx >= stages.length - 1}
                  style={{ background: COLORS.coral, border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: idx >= stages.length - 1 ? "not-allowed" : "pointer", opacity: idx >= stages.length - 1 ? 0.5 : 1, fontFamily: "inherit" }}
                >
                  Next ›
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center" style={{ color: COLORS.muted }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: COLORS.text, marginBottom: 8 }}>Loading framework…</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT — call controls + notes */}
      <aside
        className="flex flex-col flex-shrink-0 w-full lg:w-[320px]"
        style={{ background: "#ffffff", borderLeft: `0.5px solid ${COLORS.line}`, borderTop: `0.5px solid ${COLORS.line}` }}
      >
        <div style={{ padding: 20, borderBottom: `1px solid ${COLORS.line}` }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: COLORS.hint, fontWeight: 500, marginBottom: 4 }}>Customer</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Dave (AI)</div>
          <div style={{ fontSize: 12, color: COLORS.hint }}>Practice roleplay partner</div>
        </div>

        <div style={{ padding: 20, borderBottom: `1px solid ${COLORS.line}` }}>
          {!isConnected ? (
            <button
              onClick={startCall}
              disabled={starting || status === "connecting"}
              style={{ width: "100%", background: COLORS.coral, color: "#fff", border: "none", borderRadius: 8, padding: "12px 18px", fontWeight: 600, fontSize: 14, cursor: starting ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}
            >
              <PhoneCall className="h-4 w-4" />
              {starting || status === "connecting" ? "Connecting…" : "Start practice call"}
            </button>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: isSpeaking ? "#ecfdf5" : "#fff7ed", border: `1px solid ${isSpeaking ? COLORS.green : "#fdba74"}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: isSpeaking ? "#047857" : "#9a3412", marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: isSpeaking ? COLORS.green : "#f97316", animation: "pcPulse 1.2s ease-in-out infinite", display: "inline-block" }} />
                {isSpeaking ? "Dave is speaking" : "Listening to you"}
              </div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 18, fontWeight: 600, color: COLORS.text, textAlign: "center", padding: "8px 0", marginBottom: 10 }}>
                {fmtTime(elapsed)}
              </div>
              <button
                onClick={endCall}
                style={{ width: "100%", background: "#fff", color: COLORS.red, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}
              >
                <PhoneOff className="h-4 w-4" /> End call
              </button>
            </>
          )}
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: COLORS.hint, fontWeight: 500, marginBottom: 12 }}>Live notes</div>
          {([
            { key: "whyNow" as const, label: "Why now", placeholder: "What's pushing them to act today?" },
            { key: "theirWords" as const, label: "Their words", placeholder: "Quote them exactly." },
            { key: "objection" as const, label: "Objection", placeholder: "What's the real hesitation?" },
          ]).map((f) => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.hint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {f.label}
              </label>
              <textarea
                value={notes[f.key]}
                onChange={(e) => setNotes((n) => ({ ...n, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                style={{ width: "100%", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13, color: COLORS.text, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fff" }}
              />
            </div>
          ))}
        </div>
      </aside>

      <style>{`
        @keyframes pcPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.5; } }
        input::placeholder, textarea::placeholder { color: #999; opacity: 1; }
      `}</style>
    </div>
  );
}

function PracticeCallPageWrapper() {
  return (
    <ConversationProvider>
      <PracticeCallPage />
    </ConversationProvider>
  );
}

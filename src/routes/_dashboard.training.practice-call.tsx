import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPage,
  head: () => ({
    meta: [{ title: "Practice Call" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
      },
    ],
  }),
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
const ACCENT = "#f4522d";
const AGENT_ID = "agent_1301kt5fgx3ye9krpyc25900fy60";

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

const BAND_COLORS: Record<string, string> = {
  climb: "#2b7fff",
  peak: "#a855f7",
  paper: "#16a34a",
};

function highlightTokens(text: string) {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{[^}]+\}\}$/.test(p) ? (
      <span
        key={i}
        style={{
          background: "#fff1ee",
          color: ACCENT,
          padding: "1px 6px",
          borderRadius: 4,
          fontWeight: 600,
        }}
      >
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

function PracticeCallPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [idx, setIdx] = useState(0);
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

  // Timer
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
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
      });
    } catch (e) {
      console.error(e);
      setMicError(
        e instanceof Error ? e.message : "Couldn't access your microphone. Allow mic access and try again.",
      );
    } finally {
      setStarting(false);
    }
  };

  const endCall = async () => {
    try {
      await conversation.endSession();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      {/* Top control bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #ebebeb",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          to="/training"
          style={{
            fontSize: 13,
            color: "#6b6b6b",
            textDecoration: "none",
            marginRight: 4,
          }}
        >
          ‹ Back
        </Link>

        <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Practice Call</div>

        <div style={{ flex: 1 }} />

        {!isConnected ? (
          <button
            onClick={startCall}
            disabled={starting || status === "connecting"}
            style={{
              background: ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "10px 22px",
              fontWeight: 700,
              fontSize: 14,
              cursor: starting ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(244,82,45,0.25)",
            }}
          >
            {starting || status === "connecting" ? "Connecting…" : "● Start practice call"}
          </button>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: isSpeaking ? "#ecfdf5" : "#fff7ed",
                border: `1px solid ${isSpeaking ? "#10b981" : "#fdba74"}`,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: isSpeaking ? "#047857" : "#9a3412",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: isSpeaking ? "#10b981" : "#f97316",
                  animation: "pcPulse 1.2s ease-in-out infinite",
                  display: "inline-block",
                }}
              />
              {isSpeaking ? "Dave is speaking" : "On the line with Dave — listening"}
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 14,
                fontWeight: 600,
                color: "#111",
                background: "#f3f3f3",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              {fmtTime(elapsed)}
            </div>
            <button
              onClick={endCall}
              style={{
                background: "#fff",
                color: "#dc2626",
                border: "1px solid #dc2626",
                borderRadius: 999,
                padding: "10px 18px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              End call
            </button>
          </>
        )}
      </div>

      {micError && (
        <div
          style={{
            margin: "12px 24px 0",
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13,
          }}
        >
          {micError}
        </div>
      )}

      {/* Body: cockpit + notes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 20,
          padding: "20px 24px 40px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div>
          {/* Stage stepper */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {stages.map((s, i) => {
              const active = i === idx;
              const done = i < idx;
              const color = BAND_COLORS[s.band] ?? "#6b7280";
              return (
                <button
                  key={s.stage_no}
                  onClick={() => setIdx(i)}
                  style={{
                    flex: "1 1 0",
                    minWidth: 70,
                    padding: "10px 8px",
                    border: `1px solid ${active ? color : "#ebebeb"}`,
                    background: active ? color : done ? "#f3f3f3" : "#fff",
                    color: active ? "#fff" : done ? "#6b6b6b" : "#111",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                  title={s.name}
                >
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{s.stage_no}</div>
                  <div style={{ marginTop: 2 }}>{s.name}</div>
                </button>
              );
            })}
          </div>

          {/* Current stage card */}
          {current && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #ebebeb",
                borderRadius: 12,
                padding: 22,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    background: BAND_COLORS[current.band] ?? "#6b7280",
                    padding: "3px 8px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {current.tag}
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "8px 0 6px" }}>
                {current.stage_no}. {current.name}
              </h2>
              <p style={{ color: "#6b6b6b", fontSize: 14, margin: 0 }}>{current.job}</p>

              {current.say_text && (
                <div
                  style={{
                    marginTop: 18,
                    background: "#fafaf9",
                    border: "1px solid #ebebeb",
                    borderLeft: `3px solid ${ACCENT}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: ACCENT,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 6,
                    }}
                  >
                    Say it like this
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, color: "#111", whiteSpace: "pre-wrap" }}>
                    {highlightTokens(current.say_text)}
                  </div>
                </div>
              )}

              {moves.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6b6b6b",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Moves
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: "#111", fontSize: 14, lineHeight: 1.6 }}>
                    {moves.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
                {current.move_on && (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#047857",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 4,
                      }}
                    >
                      Move on when
                    </div>
                    <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.5 }}>{current.move_on}</div>
                  </div>
                )}
                {current.never_do && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#b91c1c",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 4,
                      }}
                    >
                      Never
                    </div>
                    <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>{current.never_do}</div>
                  </div>
                )}
              </div>

              {/* Prev / Next */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <button
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  style={{
                    background: "#fff",
                    border: "1px solid #ebebeb",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: idx === 0 ? "#c4c4c4" : "#111",
                    cursor: idx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ‹ Prev
                </button>
                <div style={{ fontSize: 12, color: "#6b6b6b" }}>
                  Stage {idx + 1} of {stages.length}
                </div>
                <button
                  onClick={() => setIdx((i) => Math.min(stages.length - 1, i + 1))}
                  disabled={idx >= stages.length - 1}
                  style={{
                    background: ACCENT,
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    cursor: idx >= stages.length - 1 ? "not-allowed" : "pointer",
                    opacity: idx >= stages.length - 1 ? 0.5 : 1,
                  }}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes panel */}
        <aside
          style={{
            background: "#fff",
            border: "1px solid #ebebeb",
            borderRadius: 12,
            padding: 18,
            height: "fit-content",
            position: "sticky",
            top: 88,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 14 }}>Live notes</div>
          {(
            [
              { key: "whyNow" as const, label: "Why now", placeholder: "What's pushing them to act today?" },
              { key: "theirWords" as const, label: "Their words", placeholder: "Quote them exactly." },
              { key: "objection" as const, label: "Objection", placeholder: "What's the real hesitation?" },
            ]
          ).map((f) => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6b6b6b",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                {f.label}
              </label>
              <textarea
                value={notes[f.key]}
                onChange={(e) => setNotes((n) => ({ ...n, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                style={{
                  width: "100%",
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontFamily: FONT,
                  fontSize: 13,
                  color: "#111",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#ebebeb")}
              />
            </div>
          ))}
        </aside>
      </div>

      <style>{`
        @keyframes pcPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

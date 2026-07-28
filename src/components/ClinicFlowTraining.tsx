import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAVY = "#1a3a6b";
const NAVY_PALE = "#edf2f9";
const GREY = "#6b7785";
const LINE = "#e2e6ec";

const STEPS: { n: number; title: string; body: string }[] = [
  { n: 1, title: "Recap the phone notes", body: `"Have I got that right?"` },
  { n: 2, title: "Measure", body: "Density × area = grafts. Show the numbers." },
  { n: 3, title: "Name it", body: "Give the diagnosis in plain words." },
  { n: 4, title: "Show the method", body: "Model or 60-second video." },
  { n: 5, title: "Show the simulation", body: `"This is a simulation, results vary."` },
  { n: 6, title: "Timeline photos", body: "Day 1 to month 12, ugly bits included." },
  { n: 7, title: "Alternatives and risks", body: "Honestly." },
  { n: 8, title: "Check fit", body: "Expectations realistic, wellbeing screen clear. If not, refer." },
  { n: 9, title: "Hand over the quote", body: "Stop talking." },
  { n: 10, title: "Book the date", body: `"Thursday or Tuesday, which suits?" Money is admin, sorted separately.` },
  { n: 11, title: "Summary goes out same day", body: "" },
];

const LINES: { label: string; text: string }[] = [
  { label: "Opener", text: `"Before we start, can I run through your phone notes so I've got the full picture?"` },
  { label: "Price", text: `"Here's everything on one page — take a minute." (then silence)` },
  { label: "The ask", text: `"Which of those two dates works better for you?"` },
  { label: "Price pushback", text: `"The price is the price — my job is making sure the plan is exactly right for you."` },
];

const RULES: string[] = [
  "Never discount.",
  "Never promise a result.",
  "Every patient leaves with a date or a booked call.",
  "Wellbeing flags = slow down and refer.",
];

export function ClinicFlowTraining({ clinicId }: { clinicId: string }) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clinicflow_clinic_settings")
        .select("follicle_model_url")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      setModelUrl((data?.follicle_model_url as string | null) ?? null);
    })();
  }, [clinicId]);

  return (
    <div style={{ padding: "32px 24px 80px", maxWidth: 900, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#111" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: NAVY, margin: "0 0 6px", letterSpacing: -0.3 }}>The Process</h1>
      <p style={{ color: GREY, fontSize: 15, margin: 0 }}>How every consult should run. Read it before each patient.</p>

      <SectionTitle>The consult — 11 steps</SectionTitle>
      <div style={{ display: "grid", gap: 10 }}>
        {STEPS.map((s) => (
          <div key={s.n} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 16px", display: "grid", gridTemplateColumns: "44px 1fr", gap: 14, alignItems: "start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: NAVY_PALE, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>{s.n}</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{s.title}</div>
              {s.body && <div style={{ fontSize: 15, color: "#334155", marginTop: 4, lineHeight: 1.5 }}>{s.body}</div>}
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>The four lines</SectionTitle>
      <div style={{ display: "grid", gap: 10 }}>
        {LINES.map((l) => (
          <div key={l.label} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: GREY }}>{l.label}</div>
            <div style={{ fontSize: 17, color: "#111", marginTop: 4, lineHeight: 1.5 }}>{l.text}</div>
          </div>
        ))}
      </div>

      <SectionTitle>Rules</SectionTitle>
      <ul style={{ margin: 0, padding: "0 0 0 22px", display: "grid", gap: 8 }}>
        {RULES.map((r) => (
          <li key={r} style={{ fontSize: 16, color: "#111", lineHeight: 1.5 }}>{r}</li>
        ))}
      </ul>

      {modelUrl && (
        <div style={{ marginTop: 32, background: NAVY_PALE, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 10 }}>Ordering the follicle demo model?</div>
          <a
            href={modelUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-block", background: NAVY, color: "#fff", padding: "12px 22px", borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: "none" }}
          >
            Get the follicle model
          </a>
        </div>
      )}

      <div style={{ marginTop: 24, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: "#166534", lineHeight: 1.55 }}>
        <strong>WhatsApp Business:</strong> Use the free WhatsApp Business app on a dedicated clinic number — never the doctor's personal number.
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 700, color: GREY, textTransform: "uppercase", letterSpacing: 0.6, margin: "36px 0 14px" }}>{children}</h2>;
}

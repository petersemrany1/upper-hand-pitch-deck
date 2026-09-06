import type { ReactNode } from "react";
import { AMBER, BIG, CARD, FAINT, INK, LABEL, MUTED, TONE, type Tone } from "./format";

/** One big number with a label above and a one-line explanation below. */
export function StatTile({
  label,
  value,
  sub,
  title,
  accent,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  title?: string;
  accent?: string;
}) {
  return (
    <div title={title} style={{ minWidth: 0 }}>
      <div style={LABEL}>{label}</div>
      <div style={{ ...BIG, color: accent ?? INK }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

export function TileRow({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  return (
    <div
      style={{
        ...CARD,
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${columns >= 4 ? 170 : 220}px, 1fr))`,
        gap: 18,
        padding: "20px 22px",
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 18px 6px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{children}</div>
      {right ? <div style={{ fontSize: 12, color: MUTED }}>{right}</div> : null}
    </div>
  );
}

export function Footnote({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <div style={{ padding: "10px 18px 14px", fontSize: 11.5, color: warn ? AMBER : FAINT, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function Pill({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 999,
        background: t.bg,
        color: t.text,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />
      {children}
    </span>
  );
}

/** Two-colour horizontal bar: marketing share on the left, labour on the right. */
export function SplitBar({ share, height = 8, title }: { share: number | null; height?: number; title?: string }) {
  const pct = share === null ? 0 : Math.max(0, Math.min(1, share)) * 100;
  return (
    <div
      title={title}
      style={{ display: "flex", width: "100%", height, borderRadius: 999, overflow: "hidden", background: share === null ? "#ececea" : "#d8c6a8" }}
    >
      <div style={{ width: `${pct}%`, background: INK, transition: "width 200ms" }} />
    </div>
  );
}

export function Note({ children, tone = "amber" }: { children: ReactNode; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <div style={{ fontSize: 11.5, color: t.text, background: t.bg, padding: "6px 10px", borderRadius: 8 }}>
      {children}
    </div>
  );
}

// Ported from the Legal app (family-law-floater/src/components/sales-call/call-ui.tsx). Re-run the port script to refresh.
import type { ReactNode } from "react";

export function StepShell({
  eyebrow,
  heading,
  children,
  contentClassName,
}: {
  eyebrow: string;
  heading: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div
      className="mx-auto w-full text-center"
      style={{
        maxWidth: "min(100%, clamp(38rem, 62vw, 60rem))",
        fontSize: "clamp(1rem, 0.65vw + 0.78rem, 1.25rem)",
        lineHeight: 1.65,
      }}
    >
      <p
        className="font-medium uppercase tracking-[0.16em]"
        style={{ color: "var(--coral)", fontSize: "clamp(0.6875rem, 0.25vw + 0.6rem, 0.875rem)" }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-3 font-semibold leading-[1.15]"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.375rem, 1.5vw + 0.85rem, 2.25rem)",
        }}
      >
        {heading}
      </h2>
      <div className={`mx-auto mt-10 max-w-[44rem] space-y-6 ${contentClassName ?? ""}`}>{children}</div>
    </div>
  );
}

export function SayThis({
  children,
  label = "Say this",
  size = "md",
}: {
  children: ReactNode;
  label?: string;
  size?: "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl" ? "text-[22px] leading-relaxed" : size === "lg" ? "text-[19px] leading-relaxed" : "text-[15px] leading-relaxed";
  return (
    <div
      className="rounded-r-lg border-l-[3px] bg-muted/40 px-4 py-3 text-left"
      style={{ borderColor: "var(--coral)" }}
    >
      <p
        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "var(--coral)" }}
      >
        {label}
      </p>
      <div className={sizeClass}>{children}</div>
    </div>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

export function ReminderCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-left text-[13px] leading-snug">{children}</div>
  );
}

export function WowBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border bg-muted/50 px-3 py-2 text-left text-[13px] leading-relaxed">
      <span
        className="mr-2 text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "var(--coral)" }}
      >
        Wow
      </span>
      {children}
    </div>
  );
}

export function ChapterCard({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "var(--coral)" }}
        >
          {index}
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

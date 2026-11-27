import { BUSINESS_COLOR, BUSINESS_LABEL, type BusinessView } from "@/lib/business";

type Props = {
  value: BusinessView;
  onChange: (next: BusinessView) => void;
  allowBoth?: boolean;
  size?: "sm" | "md";
};

// Segmented Hair Transplants / Legal (/ Both) control. Each business keeps its
// own colour everywhere in the portal so it is always obvious which one you're in.
export function BusinessSwitch({ value, onChange, allowBoth, size = "md" }: Props) {
  const options: BusinessView[] = allowBoth ? ["hair", "legal", "both"] : ["hair", "legal"];
  const pad = size === "sm" ? "4px 10px" : "6px 14px";
  return (
    <div
      role="tablist"
      aria-label="Business"
      className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      style={{ background: "#f1f1ef", border: "1px solid #e6e6e3" }}
    >
      {options.map((opt) => {
        const active = opt === value;
        const color = opt === "both" ? { fg: "#111111", bg: "#ffffff", border: "#d9d9d6" } : BUSINESS_COLOR[opt];
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className="inline-flex items-center gap-1.5 rounded-full font-medium transition-colors"
            style={{
              padding: pad,
              fontSize: size === "sm" ? 12 : 13,
              background: active ? color.bg : "transparent",
              color: active ? color.fg : "#6b6b68",
              boxShadow: active ? `inset 0 0 0 1px ${color.border}` : "none",
            }}
          >
            {opt !== "both" && (
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: BUSINESS_COLOR[opt].fg, opacity: active ? 1 : 0.45 }}
              />
            )}
            {BUSINESS_LABEL[opt]}
          </button>
        );
      })}
    </div>
  );
}

export function BusinessChip({ business }: { business: "hair" | "legal" }) {
  const c = BUSINESS_COLOR[business];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.fg, boxShadow: `inset 0 0 0 1px ${c.border}` }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: c.fg }} />
      {business === "hair" ? "Hair" : "Legal"}
    </span>
  );
}

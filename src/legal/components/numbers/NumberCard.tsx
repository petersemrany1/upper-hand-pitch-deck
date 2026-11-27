// Ported from the Legal app (family-law-floater/src/components/numbers/NumberCard.tsx). Re-run the port script to refresh.
export function NumberCard({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`numbers-kpi${emphasis ? " numbers-kpi-emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

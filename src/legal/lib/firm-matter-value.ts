// Ported from the Legal app (family-law-floater/src/lib/firm-matter-value.ts). Re-run the port script to refresh.
export type MatterValueInputs = {
  nonCourtFee: number;
  courtFee: number;
  courtMatters: number;
};

/** Add grouping while retaining decimal places and shorthand during editing. */
export function formatMatterFeeInput(value: string): string {
  const parts = /^(\s*\$?\s*)([\d,]+)(\.\d*)?(\s*k?\s*)$/i.exec(value);
  if (!parts) return value;
  const whole = parts[2]!.replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${parts[1]}${whole}${parts[3] ?? ""}${parts[4]}`;
}

/** Allow normal dollar entry, commas and shorthand such as 25k. Blank is not zero. */
export function parseMatterFee(value: string): number | null {
  const cleaned = value.trim().replace(/^\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?\s*k?$/i.test(cleaned)) return null;
  const amount = Number(cleaned.replace(/[,\s]|k/gi, "")) * (/k$/i.test(cleaned) ? 1000 : 1);
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents <= 100_000_000_000 ? cents / 100 : null;
}

export function calculateMatterValue(inputs: MatterValueInputs) {
  const { nonCourtFee, courtFee, courtMatters } = inputs;
  if (
    ![nonCourtFee, courtFee].every(
      (fee) => Number.isFinite(fee) && fee >= 0 && fee <= 1_000_000_000,
    ) ||
    !Number.isInteger(courtMatters) ||
    courtMatters < 0 ||
    courtMatters > 10
  )
    return null;
  const nonCourtMatters = 10 - courtMatters;
  const nonCourtTotal = (Math.round(nonCourtFee * 100) * nonCourtMatters) / 100;
  const courtTotal = (Math.round(courtFee * 100) * courtMatters) / 100;
  const total = Math.round((nonCourtTotal + courtTotal) * 100) / 100;
  return {
    nonCourtMatters,
    nonCourtTotal,
    courtTotal,
    total,
    average: Math.round(total * 10) / 100,
  };
}

export const matterMoney = (amount: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

export function readMatterValueInputs(value: string | undefined): MatterValueInputs | null {
  try {
    const parsed = JSON.parse(value ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const inputs = {
      nonCourtFee: parsed.nonCourtFee,
      courtFee: parsed.courtFee,
      courtMatters: parsed.courtMatters,
    };
    return calculateMatterValue(inputs) ? inputs : null;
  } catch {
    return null;
  }
}

export function matterValueNote(inputs: MatterValueInputs): string {
  const result = calculateMatterValue(inputs);
  if (!result) throw new Error("Enter valid fees and a whole number from 0 to 10.");
  return `Average matter value estimate: negotiation / mediation (no court): ${result.nonCourtMatters} of 10 × ${matterMoney(inputs.nonCourtFee)} = ${matterMoney(result.nonCourtTotal)}; matters ending in court (total fee per matter): ${inputs.courtMatters} of 10 × ${matterMoney(inputs.courtFee)} = ${matterMoney(result.courtTotal)}. Total ${matterMoney(result.total)} ÷ 10 = ${matterMoney(result.average)} per matter. Based on the firm's fee estimates and case mix; not monthly revenue.`;
}

export function matterValuePatch(
  notes: string,
  inputs: MatterValueInputs,
  previous: MatterValueInputs | null,
) {
  const nextNote = matterValueNote(inputs);
  const oldNote = previous ? matterValueNote(previous) : null;
  const teamNotes = notes.includes(nextNote)
    ? notes
    : oldNote && notes.includes(oldNote)
      ? notes.replace(oldNote, nextNote)
      : [notes.trimEnd(), nextNote].filter(Boolean).join("\n\n");
  if (teamNotes.length > 12000)
    throw new Error("Call notes are full. Shorten them before adding the calculation.");
  return {
    team_notes: teamNotes,
    matter_value: matterMoney(calculateMatterValue(inputs)!.average),
    matter_value_calculation: JSON.stringify(inputs),
  };
}

// Ported from the Legal app (family-law-floater/src/lib/prominent-calculator.ts). Re-run the port script to refresh.
export type ProminentIndustry = "hair" | "legal";

// Confirmed prices and calculator monetary values include GST; do not add GST again.
export const PROMINENT_INDUSTRIES = {
  hair: {
    name: "Hair transplants",
    singular: "procedure",
    price: 880,
    defaultValue: 15000,
    href: "/hair-transplants",
  },
  legal: {
    name: "Family law",
    singular: "matter",
    price: 1980,
    defaultValue: 40000,
    href: "/family-law",
  },
} as const;

export function calculateProminentEstimate(
  industry: ProminentIndustry,
  shows: number,
  conversion: number,
  clientValue: number,
) {
  const attended = Math.max(0, Number.isFinite(shows) ? Math.floor(shows) : 0);
  const rate = Math.min(100, Math.max(0, Number.isFinite(conversion) ? conversion : 0)) / 100;
  const value = Math.max(0, Number.isFinite(clientValue) ? clientValue : 0);
  const investment = attended * PROMINENT_INDUSTRIES[industry].price;
  const clients = attended * rate;
  const revenue = clients * value;
  return {
    attended,
    investment,
    clients,
    revenue,
    afterAppointmentSpend: revenue - investment,
    revenueMultiple: investment > 0 ? revenue / investment : 0,
    breakEvenClients: value > 0 ? Math.ceil(investment / value) : null,
    breakEvenRate:
      value > 0 && attended > 0 ? (PROMINENT_INDUSTRIES[industry].price / value) * 100 : null,
  };
}

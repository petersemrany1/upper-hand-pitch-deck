// Keep the actual fractions: rounding 1 in 3 to 30% understates the return.
export const CONVERSION_OPTIONS = [
  ...Array.from({ length: 9 }, (_, i) => ({ label: `1 in ${10 - i}`, value: 1 / (10 - i) })),
  { label: "3 in 4", value: 3 / 4 },
  { label: "1 in 1", value: 1 },
];

export function calculateClinicReturn(procedureValue: number, conversionRate: number, pricePerShow: number, packSize: number) {
  const cost = packSize * pricePerShow;
  const procedures = packSize * conversionRate;
  const revenue = procedures * procedureValue;
  return {
    cost, procedures, revenue,
    costPerProcedure: procedures > 0 ? cost / procedures : 0,
    multiple: cost > 0 ? revenue / cost : 0,
  };
}

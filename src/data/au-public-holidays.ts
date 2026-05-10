// Australian public holidays per state for 2026 & 2027.
// Source: state government gazettes (NSW Industrial Relations, Business Victoria,
// QLD Office of Industrial Relations, SafeWork SA, Labour Relations WA,
// WorkSafe Tasmania, NT Worksafe, ACT Government).
//
// IMPORTANT: Refresh this file each year (add the next year's dates).
// If a state declares a one-off holiday (e.g. royal visit), append it here.
//
// Format: { date: "YYYY-MM-DD", name: "Holiday Name" }
// State codes match partner_clinics.state values: NSW, VIC, QLD, SA, WA, TAS, NT, ACT

export type AuState = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT";

export type PublicHoliday = { date: string; name: string };

// Normalise common variants to canonical state codes.
export function normaliseState(input?: string | null): AuState | null {
  if (!input) return null;
  const s = input.trim().toUpperCase();
  const map: Record<string, AuState> = {
    "NSW": "NSW", "NEW SOUTH WALES": "NSW",
    "VIC": "VIC", "VICTORIA": "VIC",
    "QLD": "QLD", "QUEENSLAND": "QLD",
    "SA": "SA", "SOUTH AUSTRALIA": "SA",
    "WA": "WA", "WESTERN AUSTRALIA": "WA",
    "TAS": "TAS", "TASMANIA": "TAS",
    "NT": "NT", "NORTHERN TERRITORY": "NT",
    "ACT": "ACT", "AUSTRALIAN CAPITAL TERRITORY": "ACT",
  };
  return map[s] ?? null;
}

// Holidays observed in every state/territory.
const NATIONAL_2026: PublicHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Australia Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-04-25", name: "ANZAC Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-28", name: "Boxing Day (observed)" }, // 26 Dec falls on Saturday
];

const NATIONAL_2027: PublicHoliday[] = [
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-01-26", name: "Australia Day" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-03-29", name: "Easter Monday" },
  { date: "2027-04-26", name: "ANZAC Day (observed)" }, // 25 Apr falls on Sunday
  { date: "2027-12-27", name: "Christmas Day (observed)" }, // 25 Dec Saturday
  { date: "2027-12-28", name: "Boxing Day (observed)" }, // 26 Dec Sunday
];

// Map of state → holidays observed (national + state-specific).
export const PUBLIC_HOLIDAYS: Record<AuState, PublicHoliday[]> = {
  NSW: [
    ...NATIONAL_2026,
    { date: "2026-04-04", name: "Easter Saturday" },
    { date: "2026-04-05", name: "Easter Sunday" },
    { date: "2026-06-08", name: "King's Birthday" },
    { date: "2026-10-05", name: "Labour Day" },
    ...NATIONAL_2027,
    { date: "2027-03-27", name: "Easter Saturday" },
    { date: "2027-03-28", name: "Easter Sunday" },
    { date: "2027-06-14", name: "King's Birthday" },
    { date: "2027-10-04", name: "Labour Day" },
  ],
  VIC: [
    ...NATIONAL_2026,
    { date: "2026-03-09", name: "Labour Day" },
    { date: "2026-04-04", name: "Easter Saturday" },
    { date: "2026-04-05", name: "Easter Sunday" },
    { date: "2026-06-08", name: "King's Birthday" },
    { date: "2026-09-25", name: "AFL Grand Final Friday" },
    { date: "2026-11-03", name: "Melbourne Cup Day" },
    ...NATIONAL_2027,
    { date: "2027-03-08", name: "Labour Day" },
    { date: "2027-03-27", name: "Easter Saturday" },
    { date: "2027-03-28", name: "Easter Sunday" },
    { date: "2027-06-14", name: "King's Birthday" },
    { date: "2027-11-02", name: "Melbourne Cup Day" },
  ],
  QLD: [
    ...NATIONAL_2026,
    { date: "2026-05-04", name: "Labour Day" },
    { date: "2026-08-12", name: "Royal Queensland Show (Brisbane)" },
    { date: "2026-10-05", name: "King's Birthday" },
    ...NATIONAL_2027,
    { date: "2027-05-03", name: "Labour Day" },
    { date: "2027-08-11", name: "Royal Queensland Show (Brisbane)" },
    { date: "2027-10-04", name: "King's Birthday" },
  ],
  SA: [
    ...NATIONAL_2026,
    { date: "2026-03-09", name: "Adelaide Cup Day" },
    { date: "2026-04-04", name: "Easter Saturday" },
    { date: "2026-06-08", name: "King's Birthday" },
    { date: "2026-10-05", name: "Labour Day" },
    { date: "2026-12-24", name: "Christmas Eve (part day)" },
    { date: "2026-12-31", name: "New Year's Eve (part day)" },
    ...NATIONAL_2027,
    { date: "2027-03-08", name: "Adelaide Cup Day" },
    { date: "2027-03-27", name: "Easter Saturday" },
    { date: "2027-06-14", name: "King's Birthday" },
    { date: "2027-10-04", name: "Labour Day" },
  ],
  WA: [
    ...NATIONAL_2026,
    { date: "2026-03-02", name: "Labour Day" },
    { date: "2026-06-01", name: "Western Australia Day" },
    { date: "2026-09-28", name: "King's Birthday" },
    ...NATIONAL_2027,
    { date: "2027-03-01", name: "Labour Day" },
    { date: "2027-06-07", name: "Western Australia Day" },
    { date: "2027-09-27", name: "King's Birthday" },
  ],
  TAS: [
    ...NATIONAL_2026,
    { date: "2026-02-09", name: "Royal Hobart Regatta (south)" },
    { date: "2026-03-09", name: "Eight Hours Day" },
    { date: "2026-04-07", name: "Easter Tuesday (public service)" },
    { date: "2026-06-08", name: "King's Birthday" },
    ...NATIONAL_2027,
    { date: "2027-02-08", name: "Royal Hobart Regatta (south)" },
    { date: "2027-03-08", name: "Eight Hours Day" },
    { date: "2027-03-30", name: "Easter Tuesday (public service)" },
    { date: "2027-06-14", name: "King's Birthday" },
  ],
  NT: [
    ...NATIONAL_2026,
    { date: "2026-04-04", name: "Easter Saturday" },
    { date: "2026-05-04", name: "May Day" },
    { date: "2026-06-08", name: "King's Birthday" },
    { date: "2026-08-03", name: "Picnic Day" },
    ...NATIONAL_2027,
    { date: "2027-03-27", name: "Easter Saturday" },
    { date: "2027-05-03", name: "May Day" },
    { date: "2027-06-14", name: "King's Birthday" },
    { date: "2027-08-02", name: "Picnic Day" },
  ],
  ACT: [
    ...NATIONAL_2026,
    { date: "2026-03-09", name: "Canberra Day" },
    { date: "2026-04-04", name: "Easter Saturday" },
    { date: "2026-04-05", name: "Easter Sunday" },
    { date: "2026-05-25", name: "Reconciliation Day" },
    { date: "2026-06-08", name: "King's Birthday" },
    { date: "2026-10-05", name: "Labour Day" },
    ...NATIONAL_2027,
    { date: "2027-03-08", name: "Canberra Day" },
    { date: "2027-03-27", name: "Easter Saturday" },
    { date: "2027-03-28", name: "Easter Sunday" },
    { date: "2027-05-31", name: "Reconciliation Day" },
    { date: "2027-06-14", name: "King's Birthday" },
    { date: "2027-10-04", name: "Labour Day" },
  ],
};

/** Returns the holiday name for that date+state, or null if not a public holiday. */
export function getHolidayName(dateStr: string, state?: string | null): string | null {
  const code = normaliseState(state);
  if (!code) return null;
  const list = PUBLIC_HOLIDAYS[code];
  const hit = list.find((h) => h.date === dateStr);
  return hit ? hit.name : null;
}

/** Convenience boolean. */
export function isPublicHoliday(dateStr: string, state?: string | null): boolean {
  return getHolidayName(dateStr, state) !== null;
}

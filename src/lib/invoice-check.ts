// All money is integer cents. Invoice dates refer to the reps' WA workdays.
export const INVOICE_TIMEZONE = "Australia/Perth";
export const INVOICE_EMAIL = "petersemrany1@gmail.com";
export const BOOKING_BONUS_CENTS = 5000;
export const INVOICE_OVERCHARGE_BUFFER_CENTS = 10000;
export type InvoiceClaim = {
  number: string;
  from: string;
  to: string;
  hours: number;
  bookings: number;
  hourlyRate: number;
  bookingRate: number;
  total: number;
};
export type SessionEvidence = {
  id: string;
  started_at: string;
  ended_at: string | null;
  verified: boolean;
  has_calls: boolean;
  seconds: number;
};
export type BookingEvidence = {
  lead_id: string;
  rep_id: string | null;
  earned_at: string;
  verified: boolean;
  patient_name: string;
};
export type InvoiceEvidence = {
  sessions: SessionEvidence[];
  bookings: BookingEvidence[];
  duplicates: string[];
  coverage_started_at: string;
  period_start: string;
  period_end: string;
  captured_at: string;
  hourly_rate_cents: number | null;
  rep_name: string;
  unattributed_bookings?: boolean;
};
export type InvoiceCheck = {
  status: "approved" | "needs_review";
  reasons: string[];
  systemHours: number;
  systemBookings: number;
  expectedTotalCents: number | null;
  claimedTotalCents: number;
  differenceCents: number | null;
};
export function cents(n: number): number {
  return Math.round(n * 100);
}

export function checkInvoice(
  claim: InvoiceClaim,
  evidence: InvoiceEvidence,
  documentIssues: string[],
): InvoiceCheck {
  const reasons = [...documentIssues];
  const differences: string[] = [];
  if (evidence.unattributed_bookings)
    reasons.push(
      "Some bookings in this period have no original rep attribution; check ownership manually.",
    );
  if (
    !Number.isFinite(Date.parse(evidence.captured_at)) ||
    !Number.isFinite(Date.parse(evidence.coverage_started_at))
  ) {
    reasons.push("Tracking coverage or check timestamp is missing or invalid.");
  }
  const start = Date.parse(evidence.period_start),
    end = Date.parse(evidence.period_end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    reasons.push("Invalid evidence period.");
  if (Date.parse(evidence.captured_at) < end)
    reasons.push("The invoice period has not finished yet.");
  if (Date.parse(evidence.coverage_started_at) > start)
    reasons.push(
      "This period predates verified tracking. Historical hours and booking ownership need manual review.",
    );
  if (evidence.duplicates.length)
    reasons.push(
      `Possible duplicate or overlapping invoice: ${evidence.duplicates.join(", ")}.`,
    );
  const sessions = [...evidence.sessions].sort(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at),
  );
  let lastEnd = -Infinity;
  let seconds = 0;
  for (const s of sessions) {
    const a = Math.max(start, Date.parse(s.started_at));
    const b = Math.min(end, Date.parse(s.ended_at ?? evidence.captured_at));
    if (!s.verified || !s.ended_at)
      reasons.push(
        `Session ${s.id}: its end time or continuous connection cannot be verified.`,
      );
    if (!s.has_calls)
      reasons.push(`Session ${s.id}: no recorded calls during this session.`);
    if (a < lastEnd) reasons.push(`Session ${s.id}: overlaps another session.`);
    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      b <= a ||
      !Number.isFinite(s.seconds) ||
      s.seconds < 0
    ) {
      reasons.push(`Session ${s.id}: invalid recorded duration.`);
      continue;
    }
    // Union prevents duplicate sessions inflating even the review figure.
    seconds += Math.max(0, b - Math.max(a, lastEnd)) / 1000;
    lastEnd = Math.max(lastEnd, b);
    if (b - a > 12 * 3600000)
      reasons.push(`Session ${s.id}: exceeds 12 hours and needs review.`);
  }
  const systemHours = Math.round(seconds / 36) / 100;
  if (cents(claim.hours) !== cents(systemHours))
    differences.push(
      `Hours: invoiced ${claim.hours}; system recorded ${systemHours} (including breaks).`,
    );
  const unique = new Map(evidence.bookings.map((b) => [b.lead_id, b]));
  if (unique.size !== evidence.bookings.length)
    reasons.push("Duplicate booking evidence was found.");
  for (const b of unique.values()) {
    if (!b.verified || !b.rep_id)
      reasons.push(
        `Booking ${b.lead_id}: original booking date or rep ownership is unverified.`,
      );
    if (
      Date.parse(b.earned_at) < start ||
      Date.parse(b.earned_at) >= end ||
      !Number.isFinite(Date.parse(b.earned_at))
    )
      reasons.push(`Booking ${b.lead_id}: outside the invoice dates.`);
  }
  const systemBookings = unique.size;
  if (claim.bookings !== systemBookings)
    differences.push(
      `Bookings: invoiced ${claim.bookings}; system recorded ${systemBookings} deposit-paid bookings.`,
    );
  const rate = evidence.hourly_rate_cents;
  if (rate == null)
    reasons.push("This rep does not have a verified invoice rate configured.");
  else if (cents(claim.hourlyRate) !== rate)
    differences.push(
      `Hourly rate: invoiced $${claim.hourlyRate}; agreed $${(rate / 100).toFixed(2)}.`,
    );
  if (cents(claim.bookingRate) !== BOOKING_BONUS_CENTS)
    differences.push("Booking rate differs from the agreed $50.");
  const claimedTotalCents = cents(claim.total);
  const lineTotal =
    Math.round((cents(claim.hours) * cents(claim.hourlyRate)) / 100) +
    claim.bookings * cents(claim.bookingRate);
  if (claimedTotalCents !== lineTotal)
    reasons.push(
      "Invoice total does not equal hours × rate plus bookings × $50; check tax or extra charges.",
    );
  const expectedTotalCents =
    rate == null
      ? null
      : Math.round((cents(systemHours) * rate) / 100) +
        systemBookings * BOOKING_BONUS_CENTS;
  if (expectedTotalCents != null && claimedTotalCents !== expectedTotalCents)
    differences.push(
      `Total: invoiced $${(claimedTotalCents / 100).toFixed(2)}; system calculation $${(expectedTotalCents / 100).toFixed(2)}.`,
    );
  if (!sessions.length && claim.hours > 0)
    reasons.push("No session records were found for the invoiced hours.");
  const differenceCents =
    expectedTotalCents == null ? null : claimedTotalCents - expectedTotalCents;
  return {
    status:
      reasons.length ||
      differenceCents == null ||
      differenceCents > INVOICE_OVERCHARGE_BUFFER_CENTS
        ? "needs_review"
        : "approved",
    reasons: [...new Set([...reasons, ...differences])],
    systemHours,
    systemBookings,
    expectedTotalCents,
    claimedTotalCents,
    differenceCents:
      expectedTotalCents == null
        ? null
        : claimedTotalCents - expectedTotalCents,
  };
}

// Conservative deterministic parser for the supplied two-line invoice format.
// Unknown layouts, extra lines/tax, scans, and extraction ambiguities need review.
export function compareInvoiceDocument(
  lines: string[],
  claim: InvoiceClaim,
  repName: string,
): string[] {
  const normalized = lines
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const issues: string[] = [];
  const one = (pattern: RegExp) => {
    const matches = normalized
      .map((l) => l.match(pattern))
      .filter((m): m is RegExpMatchArray => !!m);
    return matches.length === 1 ? matches[0] : null;
  };
  const number = one(/^Invoice\s*#:\s*(\S+)$/i);
  const owner = one(/\bFrom:\s*(.+)$/i);
  if (!number || number[1] !== claim.number)
    issues.push("Invoice number could not be matched to the PDF.");
  if (!owner || owner[1].toLowerCase() !== repName.trim().toLowerCase())
    issues.push("Invoice issuer could not be matched to the signed-in rep.");
  const num = "([0-9]+(?:\\.[0-9]{1,2})?)";
  const hours = one(
    new RegExp(
      `^(\\d{2}/\\d{2})[-–](\\d{2}/\\d{2}) Patient Advisor ${num} ${num} ${num}$`,
      "i",
    ),
  );
  const bookings = one(
    new RegExp(`^Booked Consultations ${num} (\\d+) ${num}$`, "i"),
  );
  const total = one(/^Total\s+\$?([\d,]+(?:\.\d{1,2})?)$/i);
  const date = one(/^Date:\s*(\d{1,2}) ([A-Za-z]+) (\d{4})$/i);
  const mmdd = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  if (
    !date ||
    +date[3] !== +claim.to.slice(0, 4) ||
    claim.from.slice(0, 4) !== claim.to.slice(0, 4)
  )
    issues.push("Invoice year needs manual verification.");
  if (
    !hours ||
    hours[1] !== mmdd(claim.from) ||
    hours[2] !== mmdd(claim.to) ||
    cents(+hours[3]) !== cents(claim.hourlyRate) ||
    cents(+hours[4]) !== cents(claim.hours) ||
    cents(+hours[5]) !==
      Math.round((cents(claim.hours) * cents(claim.hourlyRate)) / 100)
  )
    issues.push(
      "PDF dates, hours, rate or hourly amount do not match the submitted figures, or its layout is unsupported.",
    );
  if (
    !bookings ||
    cents(+bookings[1]) !== cents(claim.bookingRate) ||
    +bookings[2] !== claim.bookings ||
    cents(+bookings[3]) !== claim.bookings * cents(claim.bookingRate)
  )
    issues.push("PDF booking quantity, rate or amount could not be matched.");
  if (
    !total ||
    cents(Number(total[1].replace(/,/g, ""))) !== cents(claim.total)
  )
    issues.push("PDF total could not be matched.");
  const header = normalized.findIndex((l) =>
    /^Dates Description Rate Hours\/Sets Amount$/i.test(l),
  );
  const totalIndex = normalized.findIndex((l) => /^Total\s/i.test(l));
  if (
    header < 0 ||
    totalIndex !== header + 3 ||
    !hours ||
    !bookings ||
    normalized[header + 1] !== hours[0] ||
    normalized[header + 2] !== bookings[0]
  )
    issues.push(
      "The PDF line items need manual review (unsupported layout or additional charges).",
    );
  return issues;
}

import type { InvoiceCheck, InvoiceClaim } from "./invoice-check";
const money = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;
export function invoiceEmailSummary(
  result: InvoiceCheck,
  unavailable = false,
  claim?: InvoiceClaim,
): string[] {
  if (
    unavailable ||
    result.expectedTotalCents == null ||
    result.differenceCents == null
  )
    return [
      "I couldn’t reliably read the invoice or calculate what’s owed. Please check the attached invoice before paying.",
    ];
  const difference = result.differenceCents;
  const comparison =
    difference < 0
      ? `Under-invoiced by ${money(difference)} compared with the portal records.`
      : difference === 0
        ? "The invoice matches the portal records."
        : difference <= 10000
          ? `Over-invoiced by ${money(difference)}, within your $100 buffer.`
          : `Over-invoiced by ${money(difference)}—above your $100 buffer. Hold payment.`;
  if (result.status === "approved")
    return [`Pay ${money(result.claimedTotalCents)}. ${comparison}`];
  const text = result.reasons.join(" ");
  if (/Possible duplicate or overlapping invoice/i.test(text))
    return [
      `Hold payment: this invoice or its work dates${claim ? ` (${claim.from} to ${claim.to})` : ""} were already submitted. Check whether the earlier invoice has been paid; do not pay both.`,
      comparison,
    ];
  const explanation: string[] = [];
  if (/duplicate|overlapping invoice/i.test(text))
    explanation.push(
      "This may duplicate an invoice or billing period already submitted.",
    );
  if (
    /unverified|cannot be verified|predates verified|tracking coverage|No session|no recorded calls|overlaps another|exceeds 12|invalid recorded|outside the invoice|Invalid evidence|no original rep/i.test(
      text,
    )
  )
    explanation.push(
      "Some work records are incomplete or unverified, so the portal amount is only an estimate. Confirm the hours and bookings before paying.",
    );
  if (/period has not finished/i.test(text))
    explanation.push("The invoiced work period hasn’t finished yet.");
  if (
    /PDF|issuer|Invoice number|Invoice year|line items|total does not equal|document|extraction|automatic check/i.test(
      text,
    )
  )
    explanation.push(
      "Some invoice details couldn’t be verified. Check the attached PDF before paying.",
    );
  if (
    result.status === "needs_review" &&
    difference <= 10000 &&
    !explanation.length
  )
    explanation.push(
      "The available records couldn’t confirm this invoice. Please check it before paying.",
    );
  const differences = claim
    ? [
        ...(claim.hours !== result.systemHours
          ? [
              `${claim.hours} hours invoiced versus ${result.systemHours} recorded`,
            ]
          : []),
        ...(claim.bookings !== result.systemBookings
          ? [
              `${claim.bookings} bookings invoiced versus ${result.systemBookings} recorded`,
            ]
          : []),
      ]
    : [];
  return [
    comparison,
    ...(differences.length ? [differences.join("; ") + "."] : []),
    ...explanation,
  ];
}

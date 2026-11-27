// Ported from the Legal app (family-law-floater/src/lib/firm-offers/model.ts). Re-run the port script to refresh.
import { z } from "zod";

export const MAX_SHOW_COUNT = 1000;
const showCountSchema = z.number().int().min(1).max(MAX_SHOW_COUNT);

export const businessDetailsSchema = z
  .object({
    legalName: z.string().trim().min(2, "Enter the firm legal name").max(180),
    registration: z
      .string()
      .trim()
      .refine(
        (v) => /^(\d{9}|\d{11})$/.test(v.replace(/\s/g, "")),
        "Enter a 9-digit ACN or 11-digit ABN",
      ),
    address: z.string().trim().min(8, "Enter the registered business address").max(240),
    billingEmail: z.string().trim().email("Enter a valid billing email").max(180),
  })
  .strict();
export type BusinessDetails = z.infer<typeof businessDetailsSchema>;

export const offerDraftSchema = z
  .object({
    applicationId: z.string().uuid(),
    workflow: z.literal("call_signing").optional(),
    businessDetails: businessDetailsSchema.optional(),
    firmName: z.string().trim().min(1).max(150),
    contactName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(180),
    mobile: z.string().max(30),
    reminderConsent: z.boolean().optional(),
    timezone: z
      .string()
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Use a valid IANA timezone")
      .optional(),
    arrangement: z.enum(["upfront", "split"]),
    priceCents: z.number().int().min(100).max(10000000),
    showCount: showCountSchema.optional(),
    firstBlockShows: showCountSchema.optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    try {
      pricing(d.priceCents, d.arrangement, d.showCount, d.firstBlockShows);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["firstBlockShows"],
        message: (error as Error).message,
      });
    }
    // The older automated-invoice workflow still uses fixed ten-show packs.
    if (
      d.workflow !== "call_signing" &&
      ((d.showCount ?? 10) !== 10 || (d.arrangement === "split" && (d.firstBlockShows ?? 5) !== 5))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["showCount"],
        message: "Prepare a proposal with PDF preview to use a custom pack",
      });
    if (d.workflow === "call_signing") {
      if (!d.businessDetails)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["businessDetails"],
          message: "Complete the firm legal details before generating the PDF",
        });
    } else if (!/^\+[1-9]\d{7,14}$/.test(d.mobile))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mobile"],
        message: "Use an international mobile number, e.g. +614…",
      });
  });
export const detailsSchema = z
  .object({
    legalName: z.string().trim().min(2).max(180),
    tradingName: z.string().trim().max(150),
    registration: z
      .string()
      .trim()
      .refine(
        (v) => /^(\d{9}|\d{11})$/.test(v.replace(/\s/g, "")),
        "Enter a 9-digit ACN or 11-digit ABN",
      ),
    address: z.string().trim().min(8).max(240),
    signatoryName: z.string().trim().min(2).max(100),
    position: z.string().trim().min(2).max(80),
    signatoryEmail: z.string().trim().email().max(180),
    billingEmail: z.string().trim().email().max(180),
  })
  .strict();
export type OfferDraft = z.infer<typeof offerDraftSchema>;
export type FirmDetails = z.infer<typeof detailsSchema>;
export type Company = {
  name: string;
  abn: string;
  address: string;
  email: string;
  preparedBy: string;
};
export const COMPANY_DEFAULTS: Company = {
  name: "Bold Marketing",
  abn: "98 910 419 248",
  address: "5 George Street, North Strathfield NSW",
  email: "peter@gobold.com.au",
  preparedBy: "Peter Semrany",
};
export type PaymentStatus =
  | "not_requested"
  | "awaiting_payment"
  | "processing"
  | "partially_paid"
  | "paid"
  | "failed"
  | "reversed"
  | "disputed";
export type PaymentRequest = {
  id: string;
  block: 1 | 2;
  paymentProvider: "square" | "gocardless";
  amountCents: number;
  status: PaymentStatus;
  dueDate: string;
  invoiceId?: string;
  orderId?: string;
  customerId?: string;
  url?: string;
  version?: number;
  receivedCents?: number;
};
export type Offer = {
  id: string;
  revision: number;
  version: number;
  draft: OfferDraft;
  company: Company;
  templateVersion: string;
  templateDigest: string;
  proposal: "draft" | "sent" | "withdrawn" | "revision_requested" | "declined";
  signature: "not_started" | "pending" | "awaiting_peter" | "executed";
  details?: FirmDetails;
  documentDigest?: string;
  documentPath?: string;
  envelopeId?: string;
  firmRecipientId?: string;
  peterRecipientId?: string;
  signedPath?: string;
  certificatePath?: string;
  payments: PaymentRequest[];
  onboardingComplete: boolean;
  sentAt?: string;
  expiresAt?: string;
  paused: boolean;
  optedOut: boolean;
  timezone: string;
  reminderOwner: "bold_offer_v1";
  activity: { at: string; kind: string; note?: string }[];
};
export const TEMPLATE_VERSION = "bold-combined-2026-10-21-v5";

export function preparedFirmDetails(draft: OfferDraft): FirmDetails {
  const business = businessDetailsSchema.parse(draft.businessDetails);
  return {
    ...business,
    tradingName: draft.firmName,
    signatoryName: draft.contactName,
    signatoryEmail: draft.email,
    position: "",
  };
}
export function automaticPayments(o: Offer) {
  return o.draft.workflow !== "call_signing";
}
export function pricing(
  priceCents: number,
  arrangement: "upfront" | "split",
  showCount = 10,
  firstBlockShows = Math.ceil(showCount / 2),
) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 100 || priceCents > 10000000)
    throw new Error("Invalid price");
  if (!Number.isSafeInteger(showCount) || showCount < 1 || showCount > MAX_SHOW_COUNT)
    throw new Error(`Enter a whole number of shows between 1 and ${MAX_SHOW_COUNT}`);
  if (
    arrangement === "split" &&
    (!Number.isSafeInteger(firstBlockShows) || firstBlockShows < 1 || firstBlockShows >= showCount)
  )
    throw new Error("Split payments need at least one show in each block");
  const blockShows = arrangement === "split" ? firstBlockShows : showCount;
  const secondBlockShows = showCount - blockShows;
  const ex = blockShows * priceCents;
  const secondEx = secondBlockShows * priceCents;
  // Round GST per payment, then add the blocks so every displayed total reconciles.
  const gst = Math.floor((ex + 5) / 10);
  const secondGst = Math.floor((secondEx + 5) / 10);
  return {
    shows: showCount,
    blockShows,
    secondBlockShows,
    priceCents,
    exCents: ex + secondEx,
    gstCents: gst + secondGst,
    totalCents: ex + gst + secondEx + secondGst,
    blockExCents: ex,
    blockGstCents: gst,
    blockCents: ex + gst,
    secondBlockExCents: secondEx,
    secondBlockGstCents: secondGst,
    secondBlockCents: secondEx + secondGst,
  };
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
export function parsePrice(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a price with up to two decimal places");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  pricing(cents, "upfront");
  return cents;
}
export function nextStep(o: Offer) {
  if (["withdrawn", "declined", "revision_requested"].includes(o.proposal)) return "On hold";
  if (!o.details) return "Confirm firm details";
  if (o.signature === "awaiting_peter") return "Awaiting Peter’s countersignature";
  if (o.signature !== "executed") return "Sign agreement";
  if (o.payments[0]?.status === "processing") return "Payment processing";
  if (o.payments[0]?.status !== "paid") return "Payment";
  return o.onboardingComplete ? "Ready to start" : "Onboarding";
}
export function canActivate(o: Offer) {
  return (
    o.proposal === "sent" &&
    o.signature === "executed" &&
    o.payments[0]?.status === "paid" &&
    o.onboardingComplete
  );
}
export function reminderAction(o: Offer): "sign" | "pay" | null {
  if (
    o.draft.workflow === "call_signing" ||
    o.draft.reminderConsent !== true ||
    o.reminderOwner !== "bold_offer_v1" ||
    o.proposal !== "sent" ||
    o.paused ||
    o.optedOut
  )
    return null;
  if (o.signature === "awaiting_peter") return null;
  if (o.signature !== "executed") return "sign";
  return ["awaiting_payment", "partially_paid", "failed"].includes(o.payments[0]?.status ?? "")
    ? "pay"
    : null;
}
export const REMINDER_DAYS = [0, 2, 4, 7] as const;
// Calendar days in recipient timezone, 09:00–17:00; Sydney is the explicit fallback.
export function localDay(at: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}
export function reminderSlot(
  sentAt: string,
  now: Date,
  timezone = "Australia/Sydney",
): number | null {
  const elapsed = Math.round(
    (Date.parse(localDay(now, timezone)) - Date.parse(localDay(new Date(sentAt), timezone))) /
      86400000,
  );
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 9 || hour >= 17 || elapsed < 0 || elapsed > 7) return null;
  // Only today's step is eligible. Missed steps never accumulate or restart.
  return REMINDER_DAYS.includes(elapsed as 0 | 2 | 4 | 7) ? elapsed : null;
}
export function paymentState(
  invoice: {
    status: string;
    version: number;
    amount: number;
    currency: string;
    locationId: string;
    id: string;
  },
  expected: PaymentRequest,
  locationId: string,
): PaymentStatus {
  if (
    invoice.id !== expected.invoiceId ||
    invoice.locationId !== locationId ||
    invoice.currency !== "AUD" ||
    invoice.amount > expected.amountCents ||
    invoice.amount < 0
  )
    throw new Error("Invoice identity or amount mismatch");
  if (invoice.version < (expected.version ?? -1)) return expected.status;
  if (["reversed", "disputed"].includes(expected.status)) return expected.status; // admin reconciliation required
  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(invoice.status)) return "reversed";
  if (invoice.status === "PAID" && invoice.amount === expected.amountCents) return "paid";
  if (invoice.status === "PAYMENT_PENDING") return "processing";
  if (invoice.status === "PARTIALLY_PAID") return "partially_paid";
  if (["FAILED", "CANCELED"].includes(invoice.status)) return "failed";
  return "awaiting_payment";
}
export function message(o: Offer, day: number, link: string) {
  const action = reminderAction(o);
  if (!action) return null;
  const text =
    day === 0
      ? `Hi ${o.draft.contactName.split(/\s/)[0]}, your tailored family law marketing proposal and services agreement are ready. Review your proposal, confirm your firm's details and complete your signature in your secure Bold workspace. ${link} This is an automated notification from Bold Marketing. For questions, reply to this email.`
      : action === "pay"
        ? `Your agreement is complete. Your initial invoice is ready for payment. Continue securely: ${link}.`
        : `Your family law agreement is awaiting signature. Continue securely: ${link}.`;
  return {
    subject: `${o.draft.firmName} — your proposal and agreement`,
    text: `${text}\n${o.company.name}. Manage reminders or unsubscribe in your secure workspace.`,
  };
}
export function initialInvitationAt(now: Date, timezone = "Australia/Sydney") {
  const at = new Date(now);
  for (let i = 0; i <= 24 * 60; i++) {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(at),
    );
    if (hour >= 9 && hour < 17) return at;
    at.setTime(at.getTime() + 60000);
  }
  throw new Error("Could not schedule recipient delivery window");
}
export function nextReminderAt(
  o: Offer,
  now = new Date(),
  completedSteps: number[] = [],
): string | null {
  if (!o.sentAt || !reminderAction(o)) return null;
  for (let i = 0; i <= 8 * 24; i++) {
    const at = new Date(now.getTime() + i * 3600000);
    const slot = reminderSlot(o.sentAt, at, o.timezone);
    if (slot !== null && !completedSteps.includes(slot)) return at.toISOString();
  }
  return null;
}
export function blockDueLabel(p: PaymentRequest, now = new Date(), timezone = "Australia/Sydney") {
  if (p.status === "paid") return "Paid";
  if (["reversed", "disputed", "processing"].includes(p.status))
    return p.status.replaceAll("_", " ");
  return p.dueDate < localDay(now, timezone) ? "Overdue" : "Awaiting next-block payment";
}

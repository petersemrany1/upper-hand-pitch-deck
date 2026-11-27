// Ported from the Legal app (family-law-floater/src/lib/cold-calling/email-template.ts). Re-run the port script to refresh.
// The "last resort" email a setter sends when a firm says "just email me".
// Short, plain text only, one link, one ask. Pure so it can be tested.
import { DEFAULT_BOOKING_URL } from "./settings";

/** Peter is the closer: the Calendly link in the email books time with him. */
export const CLOSER_FIRST_NAME = "Peter";
export const CLOSER_TITLE = "Senior Consultant";

export type ColdEmailSender = {
  /** Full name of the logged-in person sending (the cold caller), e.g. "Sol Bowen". */
  fullName: string;
  /** True when the sender is the closer (Peter), so the email says "book 15 minutes with me". */
  isCloser: boolean;
};

/**
 * Signature: the sender's name and the company, nothing else. Gmail files emails with link-heavy
 * signatures, phone-number tables and review badges under Promotions; two or three plain lines read
 * as a personal email. The Calendly link in the body is the only link in the email.
 */
export function signatureFor(sender: ColdEmailSender): string {
  return [sender.fullName, sender.isCloser ? `${CLOSER_TITLE}, Bold` : "Bold"].join("\n");
}

/** Local part of the From address for a sender on the verified domain, e.g. "Sol Bowen" → "sol". */
export function senderMailboxFor(fullName: string): string {
  const first = (fullName.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return first || "team";
}

export type ColdEmailInput = {
  firmName: string;
  state: string | null;
  contactFirstName: string | null;
  /** First name of the caller whose call the email refers to (usually the sender). */
  setterFirstName: string;
  sender: ColdEmailSender;
  businessName: string;
  callbackNumber: string;
  bookingUrl?: string;
};

export function buildColdEmail(input: ColdEmailInput): { subject: string; body: string } {
  const state = input.state ?? "your state";
  const senderFirst = input.sender.fullName.trim().split(/\s+/)[0] ?? "";
  const greeting = input.contactFirstName ? `Hi ${input.contactFirstName},` : "Hi there,";
  const subject = input.contactFirstName
    ? `${input.contactFirstName} — notes from our call`
    : `${input.firmName} — notes from our call`;
  const body = [
    greeting,
    "",
    // The sender is normally the person who made the call; only say "X's call" when it wasn't.
    senderFirst.toLowerCase() === input.setterFirstName.toLowerCase()
      ? "Thanks for taking my call earlier."
      : `Thanks for taking ${input.setterFirstName}'s call earlier.`,
    "",
    "To sum it up:",
    "",
    "- We run our own ads under a white-label brand and we cover all the ad spend.",
    "",
    "- Our sales floor spends 40 to 50 minutes on the phone with every enquiry. We get to the real reason they want to separate, we check the property pool, and we only send you people with $750k+ in it.",
    "",
    "- We confirm they can definitely afford you and how they will fund it (savings, or litigation funding through JustFund; if JustFund, we run an eligibility check to make sure they are likely to qualify).",
    "",
    "- We take a $75 booking fee so they actually turn up, which keeps them committed. We also tell them your hourly rate so there are no surprises.",
    "",
    "- Then we book them straight into your calendar and you get all the intel from our phone call.",
    "",
    `We take on one or two firms per city, we are looking for a long-term partner in ${state} now, and to be upfront: we know this model works well, but you have to have your consultation process dialled in.`,
    "",
    `The best next step is to book 15 minutes with ${
      input.sender.isCloser ? "me" : `${CLOSER_FIRST_NAME}, our ${CLOSER_TITLE.toLowerCase()}`
    }: ${input.bookingUrl ?? DEFAULT_BOOKING_URL}`,
    "",
    "Or reply if you have any questions.",
    "",
    "We have over 200 five-star reviews on Google and we are Australia's leading pay-per-show marketing agency.",
    "",
    "If you'd rather not hear from me again, just reply and say so.",
    "",
    signatureFor(input.sender),
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trimEnd();
  return { subject, body };
}

/**
 * The "last resort" text: one screen on a phone, the offer in a sentence, one link.
 * Replies come back to the setter's own pool number, where they surface as a callback.
 */
export function buildColdSms(input: ColdEmailInput): string {
  const senderFirst = input.sender.fullName.trim().split(/\s+/)[0] ?? "";
  const greeting = input.contactFirstName ? `Hi ${input.contactFirstName}, ` : "Hi, ";
  const whoseCall =
    senderFirst.toLowerCase() === input.setterFirstName.toLowerCase()
      ? "my call"
      : `${input.setterFirstName}'s call`;
  const bookWith = input.sender.isCloser
    ? ""
    : ` with ${CLOSER_FIRST_NAME} our ${CLOSER_TITLE.toLowerCase()}`;
  return (
    `${greeting}Thanks for taking ${whoseCall} earlier. ` +
    "Short version: we send you vetted family law clients ($750k+ property pool, confirmed they can afford a lawyer, funding checked, deposit paid) and you only pay when they show up to your firm. " +
    `Book a call here to find out more information${bookWith}: ${input.bookingUrl ?? DEFAULT_BOOKING_URL} ` +
    "Or reply here with any questions."
  );
}

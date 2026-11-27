// Ported from the Legal app (family-law-floater/src/lib/firm-offers/fixtures.ts). Re-run the port script to refresh.
import { COMPANY_DEFAULTS, TEMPLATE_VERSION, type Offer } from "./model";
/** Fictional local QA data. Never passed to a live sender. */
export const demoOffer: Offer = {
  id: "11111111-1111-4111-8111-111111111111",
  revision: 1,
  version: 0,
  draft: {
    applicationId: "22222222-2222-4222-8222-222222222222",
    firmName: "Harbour Family Lawyers",
    contactName: "Alex Morgan",
    email: "alex@example.invalid",
    mobile: "+61400000000",
    reminderConsent: true,
    arrangement: "split",
    priceCents: 185000,
  },
  company: COMPANY_DEFAULTS,
  templateVersion: TEMPLATE_VERSION,
  templateDigest: "fixture",
  proposal: "draft",
  signature: "not_started",
  payments: [],
  onboardingComplete: false,
  paused: false,
  optedOut: false,
  timezone: "Australia/Sydney",
  reminderOwner: "bold_offer_v1",
  activity: [{ at: "2026-10-04T00:00:00Z", kind: "Draft saved" }],
};

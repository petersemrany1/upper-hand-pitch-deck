// Ported from the Legal app (family-law-floater/src/lib/cold-calling/settings.ts). Re-run the port script to refresh.
import { z } from "zod";

// Admin-configurable Firm Cold Calling settings, stored as one app_settings row
// under key "cold_calling". Legal maximums live here too so the UI and the
// server validate against the same bounds.

export const COLD_CALLING_SETTINGS_KEY = "cold_calling" as const;

/** Peter's Calendly for the closer call. Used whenever the setting is blank. */
export const DEFAULT_BOOKING_URL = "https://calendly.com/paypershowcall/paypershowrollout";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export const slotSchema = z
  .object({ start: z.string().regex(timeRe), end: z.string().regex(timeRe) })
  .refine((s) => s.start < s.end, { message: "Slot must end after it starts" });

export type WindowSlot = z.infer<typeof slotSchema>;

export const windowsSchema = z.object({
  weekday: z.array(slotSchema).max(4),
  saturday: z.array(slotSchema).max(4),
  sunday: z.array(slotSchema).max(4),
});

export type CallingWindows = z.infer<typeof windowsSchema>;

export const settingsSchema = z.object({
  business_name: z.string().trim().max(200).default(""),
  callback_number: z.string().trim().max(40).default(""),
  complaints_number: z.string().trim().max(40).default(""),
  contact_email_or_website: z.string().trim().max(200).default(""),
  purpose_of_call: z.string().trim().max(500).default(""),
  booking_url: z.string().trim().max(500).default(DEFAULT_BOOKING_URL),
  power_dial_default: z.boolean().default(false),
  power_dial_countdown_seconds: z.number().int().min(3).max(30).default(5),
  call_timeout_seconds: z.number().int().min(15).max(60).default(25),
  calling_windows: windowsSchema.default({
    weekday: [
      { start: "09:30", end: "12:00" },
      { start: "14:00", end: "17:00" },
    ],
    saturday: [],
    sunday: [],
  }),
  compliance_override: z
    .object({
      enabled: z.boolean(),
      reason: z.string().trim().max(500),
      by: z.string().max(200),
      at: z.string().max(40),
    })
    .nullable()
    .default(null),
  retry_policy: z
    .object({
      // Business-day offsets per unsuccessful attempt: [after 1st, after 2nd, after 3rd].
      // 0 = later permitted session today, else next business day.
      offsets_business_days: z
        .array(z.number().int().min(0).max(30))
        .min(1)
        .max(6)
        .default([0, 1, 3]),
    })
    .default({ offsets_business_days: [0, 1, 3] }),
  // Recording is OFF for prospect calls unless an admin turns it on after legal review.
  record_calls: z.boolean().default(false),
  // Appointment setter membership (auth user ids), used for labels and preferred home.
  setter_user_ids: z.array(z.string()).default([]),
  // Legacy defaults only. Per-person sales_reps.portal_pages is now authoritative.
  setter_allowed_pages: z.array(z.string()).default([]),
});

export type ColdCallingSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: ColdCallingSettings = settingsSchema.parse({});

export function parseSettings(raw: unknown): ColdCallingSettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/**
 * Telecommunications (Telemarketing and Research Calls) Industry Standard 2017:
 * weekdays 9:00–20:00, Saturday 9:00–17:00, Sunday and national public
 * holidays prohibited. The operational schedule may only be narrower.
 */
export const LEGAL_MAX_WINDOWS: CallingWindows = {
  weekday: [{ start: "09:00", end: "20:00" }],
  saturday: [{ start: "09:00", end: "17:00" }],
  sunday: [],
};

function withinLegal(slot: WindowSlot, legal: WindowSlot[]): boolean {
  return legal.some((l) => slot.start >= l.start && slot.end <= l.end);
}

/** Errors when a configured window exceeds the legal maximum. Empty when compliant. */
export function validateWindows(windows: CallingWindows, overrideEnabled: boolean): string[] {
  if (overrideEnabled) return [];
  const errors: string[] = [];
  for (const slot of windows.weekday) {
    if (!withinLegal(slot, LEGAL_MAX_WINDOWS.weekday)) {
      errors.push(
        `Weekday slot ${slot.start}–${slot.end} is outside the legal 09:00–20:00 window.`,
      );
    }
  }
  for (const slot of windows.saturday) {
    if (!withinLegal(slot, LEGAL_MAX_WINDOWS.saturday)) {
      errors.push(
        `Saturday slot ${slot.start}–${slot.end} is outside the legal 09:00–17:00 window.`,
      );
    }
  }
  if (windows.sunday.length > 0) errors.push("Sunday calling is prohibited.");
  return errors;
}

/** Compliance fields that must be set before the first call. */
export function missingComplianceFields(settings: ColdCallingSettings): string[] {
  const missing: string[] = [];
  if (!settings.business_name) missing.push("Registered business or organisation name");
  if (!settings.callback_number) missing.push("Caller callback number");
  if (!settings.complaints_number) missing.push("Complaints/contact telephone number");
  if (!settings.contact_email_or_website) missing.push("Contact email or website");
  if (!settings.purpose_of_call) missing.push("Default purpose-of-call description");
  return missing;
}

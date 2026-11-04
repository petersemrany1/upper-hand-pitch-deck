import { afterEach, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendClinicRescheduleEmail } from "./clinic-reschedule-email.server";
import { deliverClinicEmailOnce } from "@/lib/clinic-email-delivery";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.HANDOVER_MAILER_URL;
const originalSecret = process.env.HANDOVER_MAILER_SECRET;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.HANDOVER_MAILER_URL;
  else process.env.HANDOVER_MAILER_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.HANDOVER_MAILER_SECRET;
  else process.env.HANDOVER_MAILER_SECRET = originalSecret;
});
const event = { id: "test-event", appointment_id: "nitai-appointment", email_to: "admin@nitai.example", email_subject: "Edited subject", email_body: "Edited message <not HTML>" };

function setup(cc: string | null = "marvin@nitai.example", failingTable?: string) {
  process.env.HANDOVER_MAILER_URL = "https://script.google.com/macros/s/test-mailer/exec";
  process.env.HANDOVER_MAILER_SECRET = "test-secret";
  const lookups: [string, string, unknown][] = [];
  const db = { from(table: string) {
    const query = {
      select: () => query,
      eq(column: string, value: unknown) { lookups.push([table, column, value]); return query; },
      single: async () => ({ data: table === "clinic_appointments" ? { clinic_id: "nitai-clinic" } : { handover_cc: cc }, error: table === failingTable ? new Error("Database unavailable") : null }),
    };
    return query;
  } } as unknown as SupabaseClient;
  const sent: { url: string; options: RequestInit; body: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (url, options) => {
    sent.push({ url: String(url), options: options!, body: JSON.parse(options!.body as string) });
    return Response.json({ ok: true });
  }) as typeof fetch;
  return { db, sent, lookups };
}

test("Nitai reschedule goes to admin and copies Marvin through the clinic mailer", async () => {
  const { db, sent, lookups } = setup();
  expect(await sendClinicRescheduleEmail(event, db)).toEqual({ status: "accepted" });
  expect(lookups).toEqual([["clinic_appointments", "id", event.appointment_id], ["partner_clinics", "id", "nitai-clinic"]]);
  expect(sent).toHaveLength(1);
  expect(sent[0].url).toBe(process.env.HANDOVER_MAILER_URL!);
  expect(sent[0].options.redirect).toBe("follow");
  expect(sent[0].body).toEqual({ secret: "test-secret", to: event.email_to, cc: "marvin@nitai.example", subject: event.email_subject, text: event.email_body, fromName: "Hair Transplant Group", replyTo: "peter@gobold.com.au" });
});

test("CC supports multiple saved recipients, deduplicates addresses and excludes the main recipient", async () => {
  const { db, sent } = setup(" Marvin@nitai.example; other@nitai.example\nmarvin@nitai.example, ADMIN@nitai.example invalid ");
  await sendClinicRescheduleEmail(event, db);
  expect(sent[0].body.cc).toBe("Marvin@nitai.example, other@nitai.example");
});

test("clinics with no saved CC keep their main recipient", async () => {
  for (const cc of [null, "", "  "]) {
    const { db, sent } = setup(cc);
    await sendClinicRescheduleEmail(event, db);
    expect(sent[0].body.to).toBe(event.email_to);
    expect(sent[0].body.cc).toBeUndefined();
  }
});

test("lookup failures never send an email with silently missing CCs", async () => {
  for (const table of ["clinic_appointments", "partner_clinics"]) {
    const { db, sent } = setup(undefined, table);
    expect((await sendClinicRescheduleEmail(event, db)).status).toBe("failed");
    expect(sent).toHaveLength(0);
  }
  const { db, sent } = setup();
  expect((await sendClinicRescheduleEmail({ ...event, appointment_id: null }, db)).status).toBe("failed");
  expect(sent).toHaveLength(0);
});

test("missing mailer settings fail before sending", async () => {
  const { db, sent } = setup();
  delete process.env.HANDOVER_MAILER_SECRET;
  expect((await sendClinicRescheduleEmail(event, db)).status).toBe("failed");
  expect(sent).toHaveLength(0);
});

test("temporary failures and missing confirmations remain uncertain; definite rejections can be retried", async () => {
  const { db } = setup();
  for (const [code, status] of [[400, "failed"], [429, "failed"], [408, "uncertain"], [409, "uncertain"], [502, "uncertain"]] as const) {
    globalThis.fetch = (async () => new Response("", { status: code })) as typeof fetch;
    expect((await sendClinicRescheduleEmail(event, db)).status).toBe(status);
  }
  for (const [body, status] of [[{}, "uncertain"], [{ ok: false }, "failed"]] as const) {
    globalThis.fetch = (async () => Response.json(body)) as typeof fetch;
    expect((await sendClinicRescheduleEmail(event, db)).status).toBe(status);
  }
});

test("a repeated confirmation sends only one email including the CC list", async () => {
  const { db, sent } = setup();
  let status = "pending";
  const deps = {
    claim: async () => { if (status !== "pending") return null; status = "sending"; return event; },
    existing: async () => ({ status, error: null }),
    send: () => sendClinicRescheduleEmail(event, db),
    finish: async (result: { status: string }) => { status = result.status; },
  };
  await Promise.all([deliverClinicEmailOnce(deps), deliverClinicEmailOnce(deps)]);
  await deliverClinicEmailOnce(deps);
  expect(sent).toHaveLength(1);
  expect(sent[0].body.cc).toBe("marvin@nitai.example");
});

test("ambiguous or interrupted mailer responses cannot cause automatic duplicate emails", async () => {
  for (const response of ["timeout", "invalid-json"]) {
    const { db } = setup();
    let sends = 0, status = "pending";
    globalThis.fetch = (async () => { sends++; if (response === "timeout") throw new Error("Timeout"); return new Response("Not JSON"); }) as typeof fetch;
    const deps = {
      claim: async () => { if (!["pending", "failed"].includes(status)) return null; status = "sending"; return event; },
      existing: async () => ({ status, error: null }),
      send: () => sendClinicRescheduleEmail(event, db),
      finish: async (result: { status: string }) => { status = result.status; },
    };
    expect((await deliverClinicEmailOnce(deps)).status).toBe("uncertain");
    await deliverClinicEmailOnce(deps);
    expect(sends).toBe(1);
  }
});

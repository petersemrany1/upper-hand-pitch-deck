import { describe, expect, test } from "bun:test";
import { clinicHandoverRecipients, clinicHandoverReceipt, loadClinicHandoverRecipients } from "./clinic-handover-delivery";

describe("clinic notification lookups", () => {
  const settings = { email: "clinic@example.com", handover_cc: "doctor@example.com" };
  test("a failed partner lookup never falls back to another inbox", async () => {
    const tables: string[] = [];
    await expect(loadClinicHandoverRecipients(async (table) => {
      tables.push(table);
      return { data: null, error: { message: "database unavailable" } };
    })).rejects.toThrow("Could not load");
    expect(tables).toEqual(["partner_clinics"]);
  });
  test("uses legacy settings only when no partner record exists", async () => {
    const tables: string[] = [];
    const result = await loadClinicHandoverRecipients(async (table) => {
      tables.push(table);
      return { data: table === "clinics" ? settings : null, error: null };
    });
    expect(tables).toEqual(["partner_clinics", "clinics"]);
    expect(result).toEqual({ to: settings.email, cc: [settings.handover_cc] });
  });
  test("a partner's missing address cannot be replaced by a stale legacy address", async () => {
    const tables: string[] = [];
    await expect(loadClinicHandoverRecipients(async (table) => {
      tables.push(table);
      return { data: { email: null, handover_cc: null }, error: null };
    })).rejects.toThrow("valid notification email");
    expect(tables).toEqual(["partner_clinics"]);
  });
  test("surfaces a failed legacy lookup", async () => {
    await expect(loadClinicHandoverRecipients(async (table) => ({ data: null, error: table === "clinics" ? { message: "database unavailable" } : null })))
      .rejects.toThrow("Could not load");
  });
});

describe("clinic handover destinations", () => {
  test("retains the clinic and every distinct configured CC", () => {
    expect(clinicHandoverRecipients({ email: " clinic@example.com ", handover_cc: "doctor@example.com; admin@example.com\nDoctor@example.com,CLINIC@example.com" }))
      .toEqual({ to: "clinic@example.com", cc: ["doctor@example.com", "admin@example.com"] });
  });
  test("allows a clinic without CC", () => {
    expect(clinicHandoverRecipients({ email: "clinic@example.com", handover_cc: null }).cc).toEqual([]);
  });
  test.each([null, { email: null, handover_cc: null }, { email: "", handover_cc: null }, { email: "invalid", handover_cc: null }])("never silently substitutes another recipient for %p", (clinic) => {
    expect(() => clinicHandoverRecipients(clinic)).toThrow("valid notification email");
  });
  test("does not silently drop a malformed CC address", () => {
    expect(() => clinicHandoverRecipients({ email: "clinic@example.com", handover_cc: "doctor@example.com;wrong-address" })).toThrow("CC addresses");
  });
});

describe("clinic handover receipts", () => {
  const input = { clinicId: "clinic-1", leadId: "lead-1", to: "clinic@example.com", cc: ["doctor@example.com"] };
  test("stores one provider receipt with all recipients without claiming inbox delivery", () => {
    const receipt = clinicHandoverReceipt({ ...input, providerId: " provider-message-1 " });
    expect(receipt.message_id).toBe("provider-message-1");
    expect(receipt.recipient_email).toBe(input.to);
    expect(receipt.metadata.cc).toEqual(input.cc);
    expect(receipt.metadata.delivery_state).toBe("accepted_by_provider");
    expect(receipt.status).toBe("sent");
  });
  test.each([undefined, null, "", " ", 123, {}])("rejects an untraceable successful response: %p", (providerId) => {
    expect(() => clinicHandoverReceipt({ ...input, providerId })).toThrow("Check the delivery log before trying again");
  });
});

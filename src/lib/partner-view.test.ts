import { expect, test } from "bun:test";
import { clinicPortalTarget, partnerViewSearch } from "./partner-view";
import { getPartnerViewClinicForAdmin, listPartnerViewClinicsForAdmin } from "./partner-view.server";

const clinicId = "10000000-0000-4000-8000-000000000001";
const otherClinicId = "20000000-0000-4000-8000-000000000002";
const clinic = { id: clinicId, clinic_name: "Example Clinic", is_active: true };

test("partner URLs cannot select a different clinic; staff cannot enter partner view", () => {
  expect(clinicPortalTarget("clinic", clinicId, otherClinicId)).toEqual({ clinicId, partnerView: false });
  expect(clinicPortalTarget("clinic", null, otherClinicId)).toBeNull();
  for (const userType of ["unknown", "rep", "caller"]) expect(clinicPortalTarget(userType, null, clinicId)).toBeNull();
  expect(clinicPortalTarget("admin", null, clinicId)).toEqual({ clinicId, partnerView: true });
  expect(clinicPortalTarget("admin", null)).toBeNull();
});

test("invalid or multiple clinic identifiers are discarded from route search", () => {
  expect(partnerViewSearch({ viewClinic: clinicId })).toEqual({ viewClinic: clinicId });
  for (const viewClinic of [undefined, null, [clinicId, otherClinicId], "", "not-a-clinic", { id: clinicId }]) {
    expect(partnerViewSearch({ viewClinic })).toEqual({});
  }
});

function database(admin: unknown = true, permissionError: unknown = null, row: unknown = clinic, readError: unknown = null) {
  const reads: string[] = [], filters: [string, string][] = [];
  const query = {
    select: () => query,
    eq: (key: string, value: string) => { filters.push([key, value]); return query; },
    order: async () => ({ data: row ? [row] : [], error: readError }),
    maybeSingle: async () => ({ data: row, error: readError }),
  };
  const db = {
    rpc: async (name: string) => { expect(name).toBe("is_admin_user"); return { data: admin, error: permissionError }; },
    from: (name: string) => { reads.push(name); return query; },
  } as unknown as Parameters<typeof getPartnerViewClinicForAdmin>[0];
  return { db, reads, filters };
}

test("server denies missing/non-admin permission before reading clinic data", async () => {
  for (const permission of [false, null, undefined, "true"]) {
    const { db, reads } = database(permission === undefined ? null : permission);
    await expect(listPartnerViewClinicsForAdmin(db)).rejects.toThrow("Only administrators");
    await expect(getPartnerViewClinicForAdmin(db, clinicId)).rejects.toThrow("Only administrators");
    expect(reads).toEqual([]);
  }
});

test("server fails closed when the permission lookup fails", async () => {
  const { db, reads } = database(true, new Error("Database unavailable"));
  await expect(listPartnerViewClinicsForAdmin(db)).rejects.toThrow("Only administrators");
  await expect(getPartnerViewClinicForAdmin(db, clinicId)).rejects.toThrow("Only administrators");
  expect(reads).toEqual([]);
});

test("admin view reads only the requested clinic and does not mint a login session", async () => {
  const { db, reads, filters } = database();
  expect(await getPartnerViewClinicForAdmin(db, clinicId)).toEqual(clinic);
  expect(reads).toEqual(["partner_clinics"]);
  expect(filters).toEqual([["id", clinicId]]);
});

test("invalid identifiers and deleted clinics do not return a fallback clinic", async () => {
  const bad = database();
  await expect(getPartnerViewClinicForAdmin(bad.db, "not-a-clinic")).rejects.toThrow();
  expect(bad.reads).toEqual([]);
  const missing = database(true, null, null);
  await expect(getPartnerViewClinicForAdmin(missing.db, clinicId)).rejects.toThrow("could not be found");
});

test("admin clinic picker handles empty lists and reports failed loads", async () => {
  expect(await listPartnerViewClinicsForAdmin(database().db)).toEqual([clinic]);
  expect(await listPartnerViewClinicsForAdmin(database(true, null, null).db)).toEqual([]);
  const failed = database(true, null, null, new Error("Read failed"));
  await expect(listPartnerViewClinicsForAdmin(failed.db)).rejects.toThrow("Could not load");
  await expect(getPartnerViewClinicForAdmin(failed.db, clinicId)).rejects.toThrow("Could not open");
});

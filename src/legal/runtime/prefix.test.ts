import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { legalScopedClient, rewriteSelect } from "./prefix";

const raw = createClient("https://example.supabase.co", "public-anon-key", { auth: { persistSession: false } });
const db = legalScopedClient(raw);
const url = (b: unknown) => decodeURIComponent(String((b as { url: URL }).url));

describe("legal prefix translator", () => {
  it("renames Legal tables and keeps Hair tables", () => {
    expect(url(db.from("firms").select("id"))).toContain("/rest/v1/legal_firms?select=id");
    expect(url(db.from("clinics").select("id"))).toContain("/rest/v1/clinics?select=id");
  });

  it("aliases embedded Legal tables back to their Legal names", () => {
    expect(rewriteSelect("id, firms(firm_name)")).toBe("id, firms:legal_firms(firm_name)");
    expect(rewriteSelect("*, lawyer:firm_lawyers!inner(name)")).toBe("*, lawyer:legal_firm_lawyers!inner(name)");
    expect(rewriteSelect("x, clinics(name)")).toBe("x, clinics(name)");
    expect(rewriteSelect("firms!firm_appointments_firm_id_fkey(id)")).toBe(
      "firms:legal_firms!legal_firm_appointments_firm_id_fkey(id)",
    );
    expect(rewriteSelect("status, created_at")).toBe("status, created_at");
  });

  it("rewrites selects chained after filters and writes", () => {
    const q = db.from("firm_appointments").select("id, firms(firm_name)").eq("status", "booked").limit(5);
    expect(url(q)).toContain("legal_firm_appointments?select=id,firms:legal_firms(firm_name)");
    expect(url(q)).toContain("status=eq.booked");
    const w = db.from("client_leads").update({ status: "x" }).eq("id", "1").select("id, sales_reps(name)");
    expect(url(w)).toContain("legal_client_leads?id=eq.1&select=id,sales_reps:legal_sales_reps(name)");
  });

  it("renames Legal functions and buckets only", () => {
    expect(url(db.rpc("is_admin_user"))).toContain("/rest/v1/rpc/legal_is_admin_user");
    expect(url(db.rpc("some_hair_function"))).toContain("/rest/v1/rpc/some_hair_function");
    const bucket = db.storage.from("firm-offers") as unknown as { bucketId: string };
    expect(bucket.bucketId).toBe("legal-firm-offers");
  });

  it("still behaves as a promise", async () => {
    const q = db.from("firms").select("id");
    expect(typeof (q as unknown as PromiseLike<unknown>).then).toBe("function");
  });
});

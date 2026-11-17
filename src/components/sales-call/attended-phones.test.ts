import { expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createAttendanceCheck } from "./attended-phones";

test("a partial attendance list cannot clear a caller, and retry publishes every page once", async () => {
  let reads = 0, fail = true;
  const db = createClient<Database>("https://attendance.example.test", "test", {
    auth: {persistSession: false, autoRefreshToken: false}, global: {fetch: async input => {
      reads++;
      const next = new URL(String(input)).searchParams.has("id");
      if (fail && next) return new Response('{"message":"timeout"}', {status: 400});
      const data = next ? [{id: "last", patient_phone: "after-page-one"}]
        : Array.from({length: 500}, (_,i)=>({id: String(i), patient_phone: "first-page"}));
      return Response.json(data);
    }},
  });
  const check = createAttendanceCheck(db, phone => phone ?? "");
  await expect(check()).rejects.toThrow("attendance");
  fail = false;
  const [a,b] = await Promise.all([check(), check()]);
  expect(a).toBe(b); expect(a.has("after-page-one")).toBe(true);
  expect(await check()).toBe(a); expect(reads).toBe(4);
});

import {expect, test} from "bun:test";
import {createClient} from "@supabase/supabase-js";
import type {Database} from "@/integrations/supabase/types";
import {saveSalesOutcome} from "./sales-outcome.server";

function database(found = true) {
  let stamped = false;
  const changes: {table: string; values: Record<string, unknown>}[] = [];
  const db = createClient<Database>("https://outcome.example.test", "fixture", {
    auth: {persistSession:false, autoRefreshToken:false}, global: {fetch: async (input, options) => {
      const url = new URL(String(input));
      const table = url.pathname.split("/").pop()!;
      if (options?.method === "PATCH") {
        const values = JSON.parse(String(options.body));
        changes.push({table,values});
        if (table === "meta_leads") return Response.json(found ? [{id:"lead"}] : []);
        expect(url.searchParams.get("id")).toBe("eq.latest");
        expect(url.searchParams.get("outcome")).toBe("is.null");
        stamped = true; return new Response(null,{status:204});
      }
      // Replaying the save must never search backwards for any other blank call.
      expect(url.searchParams.get("outcome")).toBeNull();
      return Response.json([{id:"latest",status:"completed",outcome:stamped?"callback_scheduled":null}]);
    }},
  });
  return {db,changes};
}
test("a callback PATCH includes its date; retrying never stamps another call", async () => {
  const {db,changes}=database();
  const data={leadId:"lead",status:"callback_scheduled",callbackAt:"2026-11-18T00:00:00.000Z"};
  expect((await saveSalesOutcome(db,data)).success).toBe(true);
  expect((await saveSalesOutcome(db,data)).success).toBe(true);
  expect(changes.map(c=>c.table)).toEqual(["meta_leads","call_records","meta_leads"]);
  expect(changes[0].values).toMatchObject({status:data.status,callback_scheduled_at:data.callbackAt});
});
test("a disappeared lead cannot produce a successful outcome", async () => {
  const {db,changes}=database(false);
  expect((await saveSalesOutcome(db,{leadId:"missing",status:"no_answer"})).success).toBe(false);
  expect(changes).toHaveLength(1);
});

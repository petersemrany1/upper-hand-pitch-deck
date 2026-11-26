import { describe, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildQueue, type CallHistory, type QueueLead } from "./queue";
import { loadRetryProgress, retryAssignment, retryAssignmentsFor } from "./retry-assignments";
import { reorderSessionQueue } from "./session-queue";

const requestedAt = "2026-11-26T02:16:58.025Z";
const lead = (id: string, created = "2026-11-25T00:00:00Z"): QueueLead => ({ id, created_at: created,
  status: "no_answer", callback_scheduled_at: null,
  raw_payload: { sales_retry: { batch_id: "retry-batch", rep_id: "nina", requested_at: requestedAt } },
});
const history = (l: QueueLead, calledAt: string | null = null): CallHistory => ({
  attempts: 20, firstCallAt: "2026-11-01T00:00:00Z", lastAttemptAt: "2026-11-26T02:00:00Z",
  todayAttempts: 4, todayFirstAttemptAt: "2026-11-26T01:00:00Z", todayLastAttemptAt: "2026-11-26T02:00:00Z",
  retry: { ...retryAssignment(l)!, calledAt },
});
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
type Row = { id: string; lead_id: string; rep_id: string; called_at: string; direction: string | null };
function fixture(rows: Row[]) {
  const urls: URL[] = [];
  let fail = false;
  const db = createClient<Database>("https://retry.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (async (input: RequestInfo | URL) => {
      const u = new URL(String(input)); urls.push(u);
      if (fail) return new Response(JSON.stringify({code: "XX000", message: "read failed"}), {status: 500});
      const ids = u.searchParams.get("lead_id")!.slice(4, -1).split(",");
      const rep = u.searchParams.get("rep_id")!.slice(3);
      const since = Date.parse(u.searchParams.get("called_at")!.slice(4));
      const offset = Number(u.searchParams.get("offset") ?? 0);
      const page = rows.filter(r => ids.includes(r.lead_id) && r.rep_id === rep && Date.parse(r.called_at) >= since)
        .sort((a, b) => a.called_at.localeCompare(b.called_at) || a.id.localeCompare(b.id))
        .slice(offset, offset + Math.min(1000, Number(u.searchParams.get("limit"))));
      return new Response(JSON.stringify(page), {headers:{"Content-Type":"application/json"}});
    }) as typeof fetch },
  });
  return { db, urls, fail: () => { fail = true; } };
}

describe("persistent rep retry batches", () => {
  test("42 newer no-answers stay ahead of October after an hour, midnight and a later week", () => {
    const batch = Array.from({length:42}, (_, i) => lead(id(i), new Date(Date.parse("2026-11-01T00:00:00Z") + i * 3600000).toISOString()));
    const old = { ...lead("old", "2026-10-01T00:00:00Z"), raw_payload: null };
    for (const time of ["2026-11-26T05:00:00Z", "2026-11-27T01:00:00Z", "2026-12-10T01:00:00Z"]) {
      const h = Object.fromEntries(batch.map(l => [l.id, history(l)]));
      h.old = {...history(old), retry: undefined, todayAttempts:0};
      const q = buildQueue({leads:[old,...batch],history:h,repId:"nina",now:new Date(time),requireHistory:true});
      expect(q.order).toEqual([...batch].reverse().map(l=>l.id).concat("old"));
      expect(h[id(0)].todayAttempts).toBe(4);
      expect(buildQueue({leads:batch,history:h,repId:"bec",now:new Date(time)}).order).toEqual([]);
    }
  });

  test("only Nina's outbound dial since the request completes a retry, including after a reload", async () => {
    const leads = [lead(id(1)),lead(id(2)),lead(id(3))];
    const rows: Row[] = [
      {id:id(11),lead_id:id(1),rep_id:"bec",called_at:"2026-11-26T03:00:00Z",direction:"outbound"},
      {id:id(12),lead_id:id(1),rep_id:"nina",called_at:"2026-11-26T03:01:00Z",direction:"inbound"},
      {id:id(13),lead_id:id(1),rep_id:"nina",called_at:"2026-11-26T01:00:00Z",direction:"outbound"},
      {id:id(14),lead_id:id(2),rep_id:"nina",called_at:"2026-11-26T03:02:00Z",direction:"outbound"},
    ];
    const f=fixture(rows), assignments=retryAssignmentsFor(leads,"nina");
    const progress = await loadRetryProgress(f.db,assignments,"nina",new AbortController().signal);
    expect(progress[id(1)].calledAt).toBeNull();
    expect(progress[id(2)].calledAt).toBe("2026-11-26T03:02:00Z");
    const h=Object.fromEntries(leads.map(l=>[l.id,{...history(l),retry:progress[l.id]}]));
    const q=()=>buildQueue({leads,history:h,repId:"nina",now:new Date("2026-11-26T05:00:00Z")}).order;
    expect(q()).toEqual([id(1),id(3)]);
    rows.push({id:id(15),lead_id:id(1),rep_id:"nina",called_at:"2026-11-26T05:00:00Z",direction:"outbound"});
    const reloaded=await loadRetryProgress(f.db,assignments,"nina",new AbortController().signal);
    expect(reloaded[id(1)].calledAt).not.toBeNull();
    expect(reloaded[id(3)].calledAt).toBeNull();
  });

  test("keeps exclusions and genuine scheduled callbacks, and requires loaded retry history", () => {
    const l=lead("retry"), h=history(l), now=new Date("2026-11-26T05:00:00Z");
    for (const status of ["booked_deposit_paid","booked_no_deposit","on_hold","not_interested","dropped","had_convo_chase_up"]) {
      expect(buildQueue({leads:[{...l,status}],history:{retry:h},repId:"nina",now}).order).toEqual([]);
    }
    expect(buildQueue({leads:[l],history:{retry:{...h,retry:undefined}},repId:"nina",now}).order).toEqual([]);
    expect(buildQueue({leads:[l],history:{retry:h},repId:"nina",now,isPaused:()=>true}).order).toEqual([]);
    expect(buildQueue({leads:[{...l,callback_scheduled_at:"2026-11-27T05:00:00Z"}],history:{retry:h},repId:"nina",now}).order).toEqual([]);
    expect(buildQueue({leads:[{...l,lead_class:"post_consult"}],history:{retry:h},repId:"nina",now}).order).toEqual([]);
  });

  test("a later assignment is not satisfied by a previous batch's history", () => {
    const l=lead("retry"), h=history(l);
    expect(buildQueue({leads:[{...l,raw_payload:{sales_retry:{batch_id:"later",rep_id:"nina",requested_at:requestedAt}}}],
      history:{retry:h},repId:"nina",now:new Date("2026-11-26T05:00:00Z")}).order).toEqual([]);
    expect(retryAssignment({...l,raw_payload:{sales_retry:{batch_id:"x",rep_id:"nina",requested_at:"invalid"}}})).toBeNull();
  });

  test("reads every page and rejects failures instead of replaying already-called leads", async () => {
    const rows=Array.from({length:1000},(_,i)=>({id:id(i),lead_id:id(1),rep_id:"nina",called_at:"2026-11-26T03:00:00Z",direction:"inbound"}));
    rows.push({id:id(1001),lead_id:id(1),rep_id:"nina",called_at:"2026-11-26T04:00:00Z",direction:"outbound"});
    const f=fixture(rows), a=retryAssignmentsFor([lead(id(1))],"nina");
    expect((await loadRetryProgress(f.db,a,"nina",new AbortController().signal))[id(1)].calledAt).toBe("2026-11-26T04:00:00Z");
    expect(f.urls).toHaveLength(2);
    f.fail();
    await expect(loadRetryProgress(f.db,a,"nina",new AbortController().signal)).rejects.toMatchObject({code:"XX000"});
  });

  test("a new retry re-enters a saved prefix once without moving the active call", () => {
    const first=reorderSessionQueue({queue:["retry","active","old"],index:1,activeId:"active",orderedIds:["retry","old"],retryIds:new Set(["retry"])});
    expect(first).toEqual(["retry","active","retry","old"]);
    // Once offered, the portal removes it from replay IDs; stale history cannot loop it.
    expect(reorderSessionQueue({queue:first,index:3,activeId:"old",orderedIds:["retry"],retryIds:new Set()})).toEqual(first);
  });
});

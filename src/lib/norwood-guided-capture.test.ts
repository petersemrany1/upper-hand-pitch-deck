import { expect, test } from "bun:test";
import { requestNorwoodPhotoCheck } from "../utils/norwood-photo-check.server";
import { checkNorwoodPhotoService } from "../utils/norwood-photo-service.server";
const clear = { head_present: true, requested_view_visible: true, quality: "clear" };
const reply = (value: unknown) => Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(value) }] });

test("unsupported structured output uses a validated tool reply with the identical image", async () => {
  const bodies: any[] = [];
  const request = (async (_: unknown, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return bodies.length === 1 ? Response.json({ error: { message: "output_config is not supported for this model" } }, { status: 400 })
      : Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "photo_check", input: clear }] });
  }) as typeof fetch;
  expect((await requestNorwoodPhotoCheck("crown", "same-original", "secret", request)).ready).toBe(true);
  expect(bodies).toHaveLength(2);
  expect(bodies[1].messages).toEqual(bodies[0].messages);
  expect(bodies[1].tools[0].input_schema).toEqual(bodies[0].output_config.format.schema);
  expect(JSON.stringify(bodies)).not.toContain("secret");
});

test("provider outages retry the same still once; authentication errors are not retried", async () => {
  for (const status of [401, 403, 429, 500, 529]) {
    let calls = 0;
    const request = (async () => { calls++; return Response.json({ error: { message: "private provider detail" } }, { status }); }) as typeof fetch;
    await expect(requestNorwoodPhotoCheck("front", "image", "key", request)).rejects.toMatchObject({ code: `HP-${status}` });
    expect(calls).toBe(status >= 429 ? 2 : 1);
  }
});

test("technical recovery never turns a wrong angle or blurred photo into an accepted photo", async () => {
  for (const wrong of [{ ...clear, requested_view_visible: false }, { ...clear, quality: "blurry" }, { ...clear, head_present: false }]) {
    let calls = 0;
    const request = (async () => { calls++; return reply(wrong); }) as typeof fetch;
    expect((await requestNorwoodPhotoCheck("crown", "image", "key", request)).ready).toBe(false);
    expect(calls).toBe(1);
  }
  const request = (async () => Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "wrong_tool", input: clear }] })) as typeof fetch;
  await expect(requestNorwoodPhotoCheck("front", "image", "key", request)).rejects.toMatchObject({ code: "HP-REPLY" });
});

test("the send-link readiness check uses a synthetic image and caches a successful real-service check", async () => {
  let calls = 0; let sent = "";
  const request = (async (_: unknown, init: RequestInit) => { calls++; sent = String(init.body); const blank={head_present:false,requested_view_visible:false,problem:"no_head"};
    return calls === 1 ? reply({frames:Array.from({length:8},(_,i)=>i===6?{head_present:true,requested_view_visible:true,problem:"none"}:blank),best_frame:6}) : reply({frames:[{head_present:true,requested_view_visible:false,problem:"wrong_angle"}],best_frame:null}); }) as typeof fetch;
  await checkNorwoodPhotoService("key", "claude-fixture-health", request);
  await checkNorwoodPhotoService("key", "claude-fixture-health", request);
  expect(calls).toBe(2);
  expect(JSON.parse(sent).messages[0].content[1].source.data.startsWith("/9j/")).toBe(true);
  expect(sent).not.toContain("patient-token");
});

import { createFileRoute } from "@tanstack/react-router";

const COACH_SYSTEM = `You are an expert sales coach specialising in NEPQ (Neuro-Emotional Persuasion Questioning) and the following sales framework in this exact order: Mindset → Opening (name, who you are, reference enquiry, pre-empt callback) → Discovery (clinical questions + WHY NOW + echoing) → Amplification (reflect pain back in one sentence, get the yes) → Education (knowledge check, product simply explained, connect to their situation) → Audiobook (paint the picture using their exact words, 2+ specific references, frame as tomorrow without the problem, then silence) → Commitment (open question only, no off-ramps) → Price and Sell (personalise to doctor, price journey in exact order) → Finance Check → Booking. Analyse the following call notes and give direct specific feedback on: 1) Did they follow the framework in order? 2) Did they use the correct opening? 3) Did they find the WHY NOW? 4) Did they amplify correctly by reflecting pain back? 5) Did they paint a genuine audiobook picture using the lead's own words? 6) Did they ask for commitment the right way with no off-ramps? 7) What was the strongest part of this call? 8) What one thing would have changed the outcome most? Be direct. Be specific. Be motivating. No vague feedback. Talk to them like a coach who cares.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/coach-stream")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        let body: { notes?: string };
        try { body = await request.json(); } catch { body = {}; }
        const notes = (body.notes ?? "").toString().slice(0, 12000);
        if (!notes.trim()) {
          return new Response(JSON.stringify({ error: "notes required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey, "anthropic-version": "2023-06-01",
            "Content-Type": "application/json", accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000, stream: true,
            system: COACH_SYSTEM,
            messages: [{ role: "user", content: `Call notes:\n\n${notes}` }],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text();
          return new Response(JSON.stringify({ error: errText.slice(0, 500) }), {
            status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Transform Claude SSE → plain text deltas
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        const enc = new TextEncoder();
        let buf = "";
        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) { controller.close(); return; }
            buf += dec.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                if (j.type === "content_block_delta" && j.delta?.type === "text_delta" && j.delta.text) {
                  controller.enqueue(enc.encode(j.delta.text));
                }
              } catch { /* ignore */ }
            }
          },
        });

        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});

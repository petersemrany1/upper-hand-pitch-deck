// Summarize a partner doctor's profile into 5–8 punchy, sales-ready dot points
// for use during a live sales call. Returns plain JSON: { points: string[] }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DoctorInput {
  name?: string | null;
  title?: string | null;
  years_experience?: number | null;
  specialties?: string | null;
  credentials?: string | null;
  training_background?: string | null;
  what_makes_them_different?: string | null;
  natural_results_approach?: string | null;
  advanced_cases?: string | null;
  talking_points?: string | null;
  aftercare_included?: string | null;
  clinic_name?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doctor } = (await req.json()) as { doctor: DoctorInput };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lines = [
      doctor.name && `Name: ${doctor.name}`,
      doctor.title && `Title: ${doctor.title}`,
      doctor.clinic_name && `Clinic: ${doctor.clinic_name}`,
      doctor.years_experience &&
        `Years experience: ${doctor.years_experience}`,
      doctor.specialties && `Specialties: ${doctor.specialties}`,
      doctor.credentials && `Credentials: ${doctor.credentials}`,
      doctor.training_background &&
        `Training background: ${doctor.training_background}`,
      doctor.what_makes_them_different &&
        `What makes them different: ${doctor.what_makes_them_different}`,
      doctor.natural_results_approach &&
        `Approach to natural results: ${doctor.natural_results_approach}`,
      doctor.advanced_cases && `Advanced cases: ${doctor.advanced_cases}`,
      doctor.talking_points && `Talking points: ${doctor.talking_points}`,
      doctor.aftercare_included &&
        `Aftercare included: ${doctor.aftercare_included}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!lines.trim()) {
      return new Response(JSON.stringify({ points: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a sales coach helping a phone rep sell a cosmetic-clinic doctor to a prospective patient mid-call.
Turn the doctor's profile into 5–8 short, punchy, spoken-word bullet points the rep can read out loud.
Rules:
- Each point ≤ 18 words. Plain English. Confident, warm, no hype words like "world-class" or "best-in-class".
- Lead with the most credibility-building facts (experience, specialties, what makes them different).
- No greetings, no preamble, no closing line. Just the bullets.
- Do NOT invent facts not present in the input.`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: lines },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_selling_points",
                description: "Return the bullet points for the rep.",
                parameters: {
                  type: "object",
                  properties: {
                    points: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 3,
                      maxItems: 8,
                    },
                  },
                  required: ["points"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_selling_points" },
          },
        }),
      },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit — try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Settings → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const text = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let points: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(parsed.points)) points = parsed.points;
      } catch (e) {
        console.error("Failed to parse tool args:", e);
      }
    }

    return new Response(JSON.stringify({ points }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-doctor error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

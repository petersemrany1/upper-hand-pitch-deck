import { createFileRoute } from "@tanstack/react-router";

type TwilioDiagnosticResponse = {
  tokenGenerated: boolean;
  jwtPrefix: string | null;
  decodedGrants: unknown;
  region: string | null;
  twimlAppSidExists: boolean;
  twimlAppVoiceUrlSet: boolean;
  twimlAppVoiceUrl: string | null;
  expectedVoiceUrl: string | null;
  signingKeySid: string | null;
  secretPrefixes: unknown;
  error?: string;
  status?: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/twilio-diagnostic")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env.SUPABASE_URL;

        if (!supabaseUrl) {
          return json(
            {
              tokenGenerated: false,
              jwtPrefix: null,
              decodedGrants: null,
              region: null,
              twimlAppSidExists: false,
              twimlAppVoiceUrlSet: false,
              twimlAppVoiceUrl: null,
              expectedVoiceUrl: null,
              signingKeySid: null,
              secretPrefixes: null,
              error: "Missing backend URL",
            } satisfies TwilioDiagnosticResponse,
            500,
          );
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/twilio-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagnostic: true }),
        });

        const rawText = await response.text();
        let data: Record<string, any> | null = null;

        try {
          data = rawText ? (JSON.parse(rawText) as Record<string, any>) : null;
        } catch {
          data = { rawText };
        }

        if (!response.ok) {
          return json(
            {
              tokenGenerated: false,
              jwtPrefix: null,
              decodedGrants: null,
              region: null,
              twimlAppSidExists: false,
              twimlAppVoiceUrlSet: false,
              twimlAppVoiceUrl: null,
              expectedVoiceUrl: null,
              signingKeySid: null,
              secretPrefixes: null,
              error: data?.error || "twilio-token request failed",
              status: response.status,
            } satisfies TwilioDiagnosticResponse,
            response.status,
          );
        }

        return json({
          tokenGenerated: Boolean(data?.token),
          jwtPrefix: data?.diagnostics?.jwtPrefix ?? data?.token?.slice(0, 20) ?? null,
          decodedGrants: data?.diagnostics?.decodedPayload?.grants ?? null,
          region: data?.diagnostics?.decodedPayload?.region ?? null,
          twimlAppSidExists: data?.diagnostics?.twimlApp?.exists ?? false,
          twimlAppVoiceUrlSet: data?.diagnostics?.twimlApp?.voiceUrlSet ?? false,
          twimlAppVoiceUrl: data?.diagnostics?.twimlApp?.voiceUrl ?? null,
          expectedVoiceUrl: data?.diagnostics?.twimlApp?.expectedVoiceUrl ?? null,
          signingKeySid: data?.diagnostics?.signingKeySid ?? null,
          secretPrefixes: data?.diagnostics?.secretPrefixes ?? null,
        } satisfies TwilioDiagnosticResponse);
      },
    },
  },
});

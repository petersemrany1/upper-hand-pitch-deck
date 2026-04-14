import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/twiml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientPhone = url.searchParams.get("clientPhone") || "";

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you now.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${url.origin}/api/twilio-status" recordingStatusCallbackMethod="POST">
    <Number>${clientPhone}</Number>
  </Dial>
</Response>`;

        return new Response(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const clientPhone = url.searchParams.get("clientPhone") || "";

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you now.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${url.origin}/api/twilio-status" recordingStatusCallbackMethod="POST">
    <Number>${clientPhone}</Number>
  </Dial>
</Response>`;

        return new Response(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      },
    },
  },
});

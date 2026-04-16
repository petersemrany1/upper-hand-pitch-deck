import { createServerFn } from "@tanstack/react-start";

const SUPABASE_URL = "https://sfwokpeeffgrkxaptqji.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd29rcGVlZmZncmt4YXB0cWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTI0MTYsImV4cCI6MjA5MTcyODQxNn0.-I-IuBjfut2VVHLUYtGKO6sl4UnqpFbU1nWm4zQRD4E";

export async function logError(
  functionName: string,
  errorMessage: string,
  context: Record<string, unknown> = {}
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        function_name: functionName,
        error_message: errorMessage,
        context,
      }),
    });
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

export const getErrorLogs = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    return res.json();
  }
);

export const resolveErrorLog = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?id=eq.${data.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ resolved: true }),
      }
    );
    return { success: true };
  });

export const getUnresolvedCount = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?resolved=eq.false&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "count=exact",
        },
      }
    );
    const count = res.headers.get("content-range")?.split("/")[1] || "0";
    return { count: parseInt(count) };
  }
);

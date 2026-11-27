// Ported from the Legal app (family-law-floater/src/lib/contracts/annature.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
/**
 * Annature e-signature client (server only).
 * Docs: https://docs.annature.com.au — auth via X-Annature-Id / X-Annature-Key.
 * Keys live in Lovable Secrets: ANNATURE_ID, ANNATURE_KEY. Never in code or chat.
 */
const BASE = "https://api.annature.com.au/v1";

function headers(): Record<string, string> {
  const id = legalEnv["ANNATURE_ID"];
  const key = legalEnv["ANNATURE_KEY"];
  if (!id || !key)
    throw new Error("Annature is not configured (ANNATURE_ID / ANNATURE_KEY missing)");
  return {
    "X-Annature-Id": id,
    "X-Annature-Key": key,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? null : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const msg =
      (json as { message?: string; error?: string } | null)?.message ??
      (json as { error?: string } | null)?.error ??
      text.slice(0, 300);
    throw new Error(`Annature ${method} ${path} failed [${res.status}]: ${msg}`);
  }
  return json as T;
}

export type AnnatureAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

/** The sending account: ANNATURE_ACCOUNT_ID if set, else the first active administrator. */
export async function resolveSendingAccountId(): Promise<string> {
  const fixed = legalEnv["ANNATURE_ACCOUNT_ID"];
  if (fixed) return fixed;
  const accounts = await call<AnnatureAccount[]>("GET", "/accounts");
  const pick =
    accounts.find((a) => a.active && a.role === "administrator") ?? accounts.find((a) => a.active);
  if (!pick) throw new Error("Annature: no active account found to send from");
  return pick.id;
}

export type AnnatureField = {
  id?: string;
  type: "signature" | "initials" | "date" | "input" | "checkbox";
  page: number;
  x_coordinate: number;
  y_coordinate: number;
  width?: number;
  height?: number;
  required?: boolean;
  font_size?: number;
  date_format?: string;
};

export type CreateEnvelopeInput = {
  name: string;
  message?: string;
  documentName: string;
  pdfBase64: string;
  signer: { name: string; email: string; redirectAfterSign?: string; message?: string };
  fields: AnnatureField[];
  metadata?: Record<string, string>;
};

export type AnnatureEnvelope = {
  id: string;
  status: string;
  recipients?: Array<{ id: string; email: string; status: string }>;
  master?: string;
  certificate?: string;
  combined?: string;
};

export async function createEnvelope(input: CreateEnvelopeInput): Promise<AnnatureEnvelope> {
  const account_id = await resolveSendingAccountId();
  return call<AnnatureEnvelope>("POST", "/envelopes", {
    name: input.name,
    message: input.message,
    account_id,
    documents: [{ name: input.documentName, base: input.pdfBase64, type: "application/pdf" }],
    recipients: [
      {
        name: input.signer.name,
        email: input.signer.email,
        type: "signer",
        // Muted: Annature sends no emails of its own. We fetch a signing token
        // and deliver the link in our own Bold email + SMS (tokens are only
        // issued for muted recipients).
        muted: true,
        message: input.signer.message,
        ...(input.signer.redirectAfterSign
          ? { redirects: { session_completed: input.signer.redirectAfterSign } }
          : {}),
        fields: input.fields,
      },
    ],
    metadata: input.metadata ?? {},
  });
}

export async function getEnvelope(id: string): Promise<AnnatureEnvelope> {
  return call<AnnatureEnvelope>("GET", `/envelopes/${id}`);
}

export async function voidEnvelope(id: string): Promise<void> {
  await call("POST", `/envelopes/${id}/void`, {});
}

/** A direct signing link for the recipient (default 30 days; Annature allows 1–90). */
export async function getSigningLink(recipientId: string, days = 30): Promise<string> {
  const r = await call<{ endpoint: string; expiration: string }>(
    "GET",
    `/recipients/${recipientId}/token?token_duration=${days}`,
  );
  if (!r.endpoint) throw new Error("Annature returned no signing link");
  return r.endpoint;
}

/** Wait for the envelope to finish processing (created → sent). Returns the last status seen. */
export async function waitUntilSent(envelopeId: string, timeoutMs = 30_000): Promise<string> {
  const started = Date.now();
  let status = "unknown";
  while (Date.now() - started < timeoutMs) {
    const env = await getEnvelope(envelopeId);
    status = env.status;
    if (status === "sent" || status === "completed") return status;
    if (status === "voided") return status;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return status;
}

/**
 * Signing link with patience: the envelope must be `sent` before Annature will
 * issue a token, so poll for that first, then retry the token a few times.
 */
export async function getSigningLinkWhenReady(
  envelopeId: string,
  recipientId: string,
  days = 30,
): Promise<string> {
  await waitUntilSent(envelopeId);
  let lastErr: Error | null = null;
  // ~10s of retries in total (1s, 2s, 3s, 4s) — long enough for Annature to
  // catch up, short enough that the admin isn't left staring at a spinner.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await getSigningLink(recipientId, days);
    } catch (e) {
      lastErr = e as Error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error("Annature signing link unavailable");
}

/** Un-mute so Annature sends its own signing email (fallback when no token is issued). */
export async function unmuteRecipient(recipientId: string): Promise<void> {
  await call("PUT", `/recipients/${recipientId}`, { muted: false });
}

export async function resendRecipientEmail(recipientId: string): Promise<void> {
  await call("POST", `/recipients/${recipientId}/resend-email`, {});
}

/**
 * Execution page (page 9) — the Firm's block, right-hand column. 72 DPI,
 * page origin bottom-left. For signature/date the y is the field's bottom
 * edge; for `input` fields Annature measures y to the field's TOP edge
 * (confirmed against a live envelope, 4 Sep 2026). Baselines measured from
 * the source PDF (see contracts/*.pdf): Signature 304, Full Name 329,
 * Position 354, Date 379 from the top of an 842pt page.
 */
export function firmExecutionFields(): AnnatureField[] {
  const H = 842;
  return [
    {
      id: "firm_signature",
      type: "signature",
      page: 9,
      x_coordinate: 352,
      y_coordinate: H - 304 - 2,
      width: 150,
      height: 30,
      required: true,
    },
    {
      id: "firm_full_name",
      type: "input",
      page: 9,
      x_coordinate: 355,
      y_coordinate: H - (329 - 11),
      width: 150,
      height: 14,
      required: true,
      font_size: 10,
    },
    {
      id: "firm_position",
      type: "input",
      page: 9,
      x_coordinate: 348,
      y_coordinate: H - (354 - 11),
      width: 155,
      height: 14,
      required: true,
      font_size: 10,
    },
    {
      id: "firm_date",
      type: "date",
      page: 9,
      x_coordinate: 332,
      y_coordinate: H - 379 - 2,
      width: 130,
      height: 14,
      required: true,
      date_format: "DD/MM/YYYY",
    },
  ];
}

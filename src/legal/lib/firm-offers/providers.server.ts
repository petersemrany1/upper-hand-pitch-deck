// Ported from the Legal app (family-law-floater/src/lib/firm-offers/providers.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Offer, PaymentRequest } from "./model";
import { pricing, TEMPLATE_VERSION } from "./model";

type Env = Record<string, string | undefined>;
export function configurationBlockers(env: Env = legalEnv): string[] {
  const required = [
    "BOLD_OFFERS_MODE",
    "BOLD_OFFER_TOKEN_SECRET",
    "BOLD_OFFER_ORIGIN",
    "BOLD_TEMPLATE_APPROVED_VERSION",
    "BOLD_COMPANY_APPROVED",
    "BOLD_SQUARE_ACCESS_TOKEN",
    "BOLD_SQUARE_LOCATION_ID",
    "BOLD_SQUARE_MERCHANT_ID",
    "BOLD_ANNATURE_ACCOUNT_ID",
    "ANNATURE_ID",
    "ANNATURE_KEY",
    "BOLD_COUNTERSIGNER_USER_ID",
    "BOLD_SENDER_APPROVED",
    "BOLD_OFFER_REMINDERS_ENABLED",
    "BOLD_OFFER_FROM_EMAIL",
    "BOLD_OFFER_SMS_FROM",
    "BOLD_ANNATURE_DOWNLOAD_HOSTS",
    "BOLD_ANNATURE_WEBHOOK_SECRET",
    "BOLD_SQUARE_WEBHOOK_SIGNATURE_KEY",
    "BOLD_SQUARE_WEBHOOK_URL",
    "BOLD_OFFER_WORKER_SECRET",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "RESEND_API_KEY",
    "LOVABLE_API_KEY",
  ];
  const missing = required.filter((k) => !env[k]);
  if (!providerActionsEnabled(env))
    missing.push(
      "Provider actions disabled: set BOLD_OFFERS_MODE=sandbox, or separately approve live mode with BOLD_OFFERS_LIVE_ENABLED",
    );
  if (env["BOLD_OFFERS_MODE"] === "sandbox")
    for (const key of [
      "BOLD_ANNATURE_TEST_ACCOUNT_APPROVED",
      "BOLD_TEST_RECIPIENT_EMAILS",
      "BOLD_TEST_RECIPIENT_MOBILES",
    ])
      if (!env[key]) missing.push(key);
  if (env["BOLD_COMPANY_APPROVED"] !== "true") missing.push("BOLD_COMPANY_APPROVED must be true");
  if (env["BOLD_SENDER_APPROVED"] !== "true") missing.push("BOLD_SENDER_APPROVED must be true");
  if (env["BOLD_OFFER_REMINDERS_ENABLED"] !== "true")
    missing.push("BOLD_OFFER_REMINDERS_ENABLED must be true");
  if (
    env["BOLD_SQUARE_LOCATION_ID"] &&
    env["BOLD_SQUARE_LOCATION_ID"] === env["SQUARE_LOCATION_ID"]
  )
    missing.push(
      "BOLD_SQUARE_LOCATION_ID must be independently verified, separate from consumer deposits",
    );
  return [...new Set(missing)];
}
/** PDF generation needs no provider setup. Direct signing has no payment or messaging dependency. */
export function signingConfigurationBlockers(env: Env = legalEnv): string[] {
  const required = [
    "ANNATURE_ID",
    "ANNATURE_KEY",
    "BOLD_ANNATURE_ACCOUNT_ID",
    "BOLD_OFFER_ORIGIN",
    "BOLD_COUNTERSIGNER_USER_ID",
    "BOLD_ANNATURE_DOWNLOAD_HOSTS",
    "BOLD_ANNATURE_WEBHOOK_SECRET",
  ];
  const missing = required.filter((k) => !env[k]);
  if (!providerActionsEnabled(env))
    missing.push("Annature signing is not enabled for this environment");
  if (env["BOLD_COMPANY_APPROVED"] !== "true")
    missing.push("Confirm the saved Bold company details (BOLD_COMPANY_APPROVED)");
  if (env["BOLD_TEMPLATE_APPROVED_VERSION"] !== TEMPLATE_VERSION)
    missing.push(`Approve template ${TEMPLATE_VERSION} (BOLD_TEMPLATE_APPROVED_VERSION)`);
  if (env["BOLD_OFFERS_MODE"] === "sandbox") {
    if (env["BOLD_ANNATURE_TEST_ACCOUNT_APPROVED"] !== "true")
      missing.push("Approve the Annature test account");
    if (!env["BOLD_TEST_RECIPIENT_EMAILS"]) missing.push("BOLD_TEST_RECIPIENT_EMAILS");
  }
  return missing;
}
function secret(name: string) {
  const value = legalEnv[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
export function providerActionsEnabled(env: Env = legalEnv) {
  return (
    env["BOLD_OFFERS_MODE"] === "sandbox" ||
    (env["BOLD_OFFERS_MODE"] === "live" && env["BOLD_OFFERS_LIVE_ENABLED"] === "true")
  );
}
export function assertProviderActions() {
  if (!providerActionsEnabled()) throw new Error("Firm offer provider actions are disabled");
}
export function safeProviderUrl(value: string, hosts: string[]) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    !hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
  )
    throw new Error("Untrusted provider URL");
  return u.href;
}
export type Transport = (
  path: string,
  method: string,
  body?: unknown,
) => Promise<Record<string, unknown>>;
export function squareTransport(fetcher: typeof fetch = fetch): Transport {
  return async (path, method, body) => {
    assertProviderActions();
    const response = await fetcher(
      `${legalEnv["BOLD_OFFERS_MODE"] === "live" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com"}/v2${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${secret("BOLD_SQUARE_ACCESS_TOKEN")}`,
          "Square-Version": "2026-09-16",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : null,
      },
    );
    if (!response.ok)
      throw new Error(`Square request failed (${response.status}); reconcile before retry`);
    return response.json();
  };
}
export interface FirmPaymentAdapter {
  provider: "square" | "gocardless";
  create(o: Offer, p: PaymentRequest): Promise<PaymentRequest>;
  retrieve(p: PaymentRequest): Promise<Record<string, unknown>>;
}
export class SquareFirmAdapter implements FirmPaymentAdapter {
  provider = "square" as const;
  constructor(
    private call: Transport = squareTransport(),
    private location = legalEnv["BOLD_SQUARE_LOCATION_ID"] ?? "",
    private merchant = legalEnv["BOLD_SQUARE_MERCHANT_ID"] ?? "",
  ) {}
  async verifyLocation() {
    if (!this.location || !this.merchant)
      throw new Error("Configure BOLD_SQUARE_LOCATION_ID and BOLD_SQUARE_MERCHANT_ID");
    const r = await this.call(`/locations/${encodeURIComponent(this.location)}`, "GET");
    const l = r["location"] as {
      id: string;
      merchant_id: string;
      currency: string;
      status: string;
      business_name: string;
    };
    if (
      l.id !== this.location ||
      l.merchant_id !== this.merchant ||
      l.currency !== "AUD" ||
      l.status !== "ACTIVE"
    )
      throw new Error("Bold Square merchant/location verification failed");
  }
  async create(o: Offer, p: PaymentRequest): Promise<PaymentRequest> {
    if (o.signature !== "executed" || !o.details)
      throw new Error("Both signatures are required before invoicing");
    if (p.paymentProvider !== "square") throw new Error("Provider mismatch");
    await this.verifyLocation();
    const key = `bold-${p.id}`;
    const customer = await this.call("/customers", "POST", {
      idempotency_key: `${key}-customer`,
      company_name: o.details.legalName,
      email_address: o.details.billingEmail,
      reference_id: o.id,
    });
    const customerId = (customer["customer"] as { id: string }).id;
    const pr = pricing(o.draft.priceCents, o.draft.arrangement);
    const order = await this.call("/orders", "POST", {
      idempotency_key: `${key}-order`,
      order: {
        location_id: this.location,
        reference_id: p.id,
        customer_id: customerId,
        line_items: [
          {
            name: `Family law — ${o.draft.arrangement === "split" ? `Block ${p.block} (5 Qualified Shows)` : "10 Qualified Shows"}`,
            quantity: "1",
            base_price_money: {
              amount:
                p.amountCents - (o.draft.arrangement === "split" ? pr.blockGstCents : pr.gstCents),
              currency: "AUD",
            },
          },
        ],
        taxes: [{ uid: "gst", name: "GST", percentage: "10", scope: "ORDER", type: "ADDITIVE" }],
      },
    });
    const orderId = (order["order"] as { id: string }).id;
    const created = await this.call("/invoices", "POST", {
      idempotency_key: `${key}-invoice`,
      invoice: {
        location_id: this.location,
        order_id: orderId,
        primary_recipient: { customer_id: customerId },
        delivery_method: "SHARE_MANUALLY",
        title: `${o.draft.firmName} — initial pack${o.draft.arrangement === "split" ? ` / Block ${p.block}` : ""}`,
        payment_requests: [
          {
            request_type: "BALANCE",
            due_date: p.dueDate,
            automatic_payment_source: "NONE",
            reminders: [],
            tipping_enabled: false,
          },
        ],
        accepted_payment_methods: { card: true },
        store_payment_method_enabled: false,
      },
    });
    const invoice = created["invoice"] as { id: string; version: number };
    // Replaying the same create and publish keys resolves an interrupted request without another invoice.
    const published = await this.call(
      `/invoices/${encodeURIComponent(invoice.id)}/publish`,
      "POST",
      { idempotency_key: `${key}-publish`, version: invoice.version },
    );
    const result = published["invoice"] as { id: string; public_url: string; version: number };
    return {
      ...p,
      customerId,
      orderId,
      invoiceId: result.id,
      url: safeProviderUrl(
        result.public_url,
        legalEnv["BOLD_OFFERS_MODE"] === "live"
          ? ["squareup.com", "square.link"]
          : ["squareupsandbox.com"],
      ),
      version: result.version,
      status: "awaiting_payment",
    };
  }
  async retrieve(p: PaymentRequest) {
    if (!p.invoiceId) throw new Error("Missing invoice");
    await this.verifyLocation();
    return this.call(`/invoices/${encodeURIComponent(p.invoiceId)}`, "GET");
  }
}
export function paymentAdapter(provider: PaymentRequest["paymentProvider"]): FirmPaymentAdapter {
  if (provider === "gocardless")
    throw new Error("GoCardless collection is not implemented or enabled");
  return new SquareFirmAdapter();
}
export type Envelope = {
  id: string;
  status: string;
  account_id: string;
  metadata: Record<string, string>;
  recipients: { id: string; email: string; status: string; order: number }[];
  master?: string;
  certificate?: string;
};
export async function annatureCall<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  assertProviderActions();
  // Annature does not document a separate sandbox hostname. Explicit account approval is required.
  if (
    legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
    legalEnv["BOLD_ANNATURE_TEST_ACCOUNT_APPROVED"] !== "true"
  )
    throw new Error(
      "BOLD_ANNATURE_TEST_ACCOUNT_APPROVED is required; no real invitations permitted",
    );
  const r = await fetch(`https://api.annature.com.au${path}`, {
    method,
    headers: {
      "X-Annature-Id": secret("ANNATURE_ID"),
      "X-Annature-Key": secret("ANNATURE_KEY"),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!r.ok)
    throw new Error(`Annature request failed (${r.status}); reconcile the operation before retry`);
  return r.json();
}
export async function createSigningEnvelope(
  o: Offer,
  pdf: Uint8Array,
  fields: {
    party: string;
    type: string;
    page: number;
    x_coordinate: number;
    y_coordinate: number;
    width: number;
    height: number;
    required: boolean;
  }[],
): Promise<Envelope> {
  if (!o.details || !o.documentDigest)
    throw new Error("Confirm details and review the final document first");
  if (legalEnv["BOLD_OFFERS_MODE"] === "sandbox") {
    const emails = (legalEnv["BOLD_TEST_RECIPIENT_EMAILS"] ?? "")
      .toLowerCase()
      .split(",")
      .map((v) => v.trim());
    const mobiles = (legalEnv["BOLD_TEST_RECIPIENT_MOBILES"] ?? "")
      .split(",")
      .map((v) => v.trim());
    if (
      !emails.includes(o.details.signatoryEmail.toLowerCase()) ||
      !emails.includes(o.company.email.toLowerCase()) ||
      (o.draft.workflow !== "call_signing" && !mobiles.includes(o.draft.mobile))
    )
      throw new Error("All Annature test recipients and OTP destinations must be allowlisted");
  }
  return annatureCall("/v1/envelopes", "POST", {
    name: `Bold offer ${o.id} revision ${o.revision}`,
    account_id: secret("BOLD_ANNATURE_ACCOUNT_ID"),
    shared: false,
    documents: [
      {
        name: "Proposal and Agreement.pdf",
        base: Buffer.from(pdf).toString("base64"),
        type: "application/pdf",
      },
    ],
    recipients: [
      {
        name: o.details.signatoryName,
        email: o.details.signatoryEmail,
        order: 1,
        ...(o.draft.workflow === "call_signing" ? {} : { sms_auth: o.draft.mobile }),
      },
      { name: o.company.preparedBy, email: o.company.email, order: 2 },
    ].map((r, i) => ({
      ...r,
      type: "signer",
      muted: true,
      redirects: {
        session_completed: new URL(
          i === 0
            ? o.draft.workflow === "call_signing"
              ? "/firm-offer-complete"
              : "/firm-offer"
            : "/firms",
          secret("BOLD_OFFER_ORIGIN"),
        ).href,
      },
      fields: fields
        .filter((f) => f.party === (i === 0 ? "firm" : "peter"))
        .map(({ party: _, ...f }) => f),
    })),
    metadata: { offer_id: o.id, revision: String(o.revision), document_digest: o.documentDigest },
  });
}
export function verifyHook(
  provider: "square" | "annature",
  body: string,
  signature: string | null,
  env: Env = legalEnv,
) {
  if (!signature) return false;
  const secretValue =
    env[
      provider === "square" ? "BOLD_SQUARE_WEBHOOK_SIGNATURE_KEY" : "BOLD_ANNATURE_WEBHOOK_SECRET"
    ];
  if (!secretValue) return false;
  if (provider === "square" && !env["BOLD_SQUARE_WEBHOOK_URL"]) return false;
  const expected =
    provider === "square"
      ? createHmac("sha256", secretValue)
          .update(`${env["BOLD_SQUARE_WEBHOOK_URL"]}${body}`)
          .digest("base64")
      : secretValue;
  const a = Buffer.from(expected),
    b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A webhook is only a hint. Apply state only after retrieving this envelope from Annature. */
export function verifiedSignatureState(
  o: Offer,
  e: Envelope,
  accountId: string,
): Offer["signature"] {
  if (
    e.id !== o.envelopeId ||
    e.account_id !== accountId ||
    e.metadata["offer_id"] !== o.id ||
    e.metadata["revision"] !== String(o.revision) ||
    e.metadata["document_digest"] !== o.documentDigest
  )
    throw new Error("Envelope identity mismatch");
  const firm = e.recipients.find(
    (r) =>
      r.id === o.firmRecipientId &&
      r.email.toLowerCase() === o.details?.signatoryEmail.toLowerCase(),
  );
  const peter = e.recipients.find(
    (r) => r.id === o.peterRecipientId && r.email.toLowerCase() === o.company.email.toLowerCase(),
  );
  if (!firm || !peter) throw new Error("Signing recipient identity mismatch");
  if (e.status === "completed" && firm.status === "completed" && peter.status === "completed")
    return "executed";
  if (firm.status === "completed") return "awaiting_peter";
  return "pending";
}

export function assertSigningReady(o: Offer) {
  assertProviderActions();
  for (const name of [
    "ANNATURE_ID",
    "ANNATURE_KEY",
    "BOLD_ANNATURE_ACCOUNT_ID",
    "BOLD_OFFER_ORIGIN",
  ])
    secret(name);
  if (legalEnv["BOLD_TEMPLATE_APPROVED_VERSION"] !== o.templateVersion)
    throw new Error("Template approval is missing or has changed");
  if (
    legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
    legalEnv["BOLD_ANNATURE_TEST_ACCOUNT_APPROVED"] !== "true"
  )
    throw new Error("Annature test account approval is required");
}

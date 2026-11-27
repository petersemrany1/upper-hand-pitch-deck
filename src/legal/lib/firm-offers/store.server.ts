// Ported from the Legal app (family-law-floater/src/lib/firm-offers/store.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { digestToken, privateToken, assertRecipientAccess } from "./security.server";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import {
  COMPANY_DEFAULTS,
  TEMPLATE_VERSION,
  offerDraftSchema,
  preparedFirmDetails,
  type Offer,
  type OfferDraft,
  type Company,
} from "./model";
import { generateDocument, templateDigest } from "./documents.server";
// New additive schema is not yet in the generated Supabase types.
export const db = supabaseAdmin as unknown as SupabaseClient;
export const hash = digestToken;
export function tokenFor(o: Offer) {
  return privateToken(o.id, o.revision, legalEnv["BOLD_OFFER_TOKEN_SECRET"] ?? "");
}
export function workspaceLink(o: Offer) {
  const origin = legalEnv["BOLD_OFFER_ORIGIN"];
  if (!origin) throw new Error("Missing BOLD_OFFER_ORIGIN");
  const url = new URL(origin);
  if (url.protocol !== "https:" && url.hostname !== "localhost")
    throw new Error("Secure origin required");
  return `${url.origin}/firm-offer#${tokenFor(o)}`;
}
export async function loadOffer(id: string): Promise<Offer> {
  const { data, error } = await db.from("firm_offers").select("snapshot").eq("id", id).single();
  if (error || !data) throw new Error("Offer not found");
  return data.snapshot as Offer;
}
export async function saveOffer(o: Offer, kind: string, note?: string, tokenHash?: string) {
  const next = {
    ...o,
    activity: [...o.activity, { at: new Date().toISOString(), kind, ...(note ? { note } : {}) }],
  };
  const { data, error } = await db.rpc("save_firm_offer", {
    _id: o.id,
    _version: o.version,
    _snapshot: next,
    _token_hash: tokenHash ?? null,
    _expires_at: o.expiresAt ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Offer changed in another session. Refresh and try again.");
  return { ...next, version: o.version + 1 };
}
export async function listOffers(applicationId: string): Promise<Offer[]> {
  const { data, error } = await db
    .from("firm_offers")
    .select("snapshot")
    .eq("application_id", applicationId)
    .order("revision", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.snapshot as Offer);
}
export async function createDraft(raw: OfferDraft) {
  const draft = offerDraftSchema.parse(raw);
  const { data: app, error } = await db
    .from("firm_applications")
    .select("id")
    .eq("id", draft.applicationId)
    .single();
  if (error || !app) throw new Error("Application not found");
  const existing = await listOffers(draft.applicationId);
  if (
    existing.some(
      (o) =>
        o.signature === "executed" ||
        o.signature === "awaiting_peter" ||
        (o.signature === "pending" && o.proposal === "sent"),
    )
  )
    throw new Error("Signing has begun. Use a reviewed agreement-change process.");
  const { data: settings, error: settingsError } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "bold_company")
    .maybeSingle();
  if (settingsError) throw new Error(settingsError.message);
  const company = { ...COMPANY_DEFAULTS, ...(settings?.value ?? {}) } as Company;
  for (const k of Object.keys(COMPANY_DEFAULTS) as (keyof Company)[])
    if (typeof company[k] !== "string" || !company[k].trim())
      throw new Error(`Invalid Bold company setting: ${k}`);
  const o: Offer = {
    id: randomUUID(),
    revision: (existing[0]?.revision ?? 0) + 1,
    version: 0,
    draft,
    company,
    ...(draft.workflow === "call_signing" ? { details: preparedFirmDetails(draft) } : {}),
    templateVersion: TEMPLATE_VERSION,
    templateDigest: templateDigest(draft.arrangement),
    proposal: "draft",
    signature: "not_started",
    payments: [],
    onboardingComplete: false,
    paused: false,
    optedOut: false,
    timezone: draft.timezone ?? "Australia/Sydney",
    reminderOwner: "bold_offer_v1",
    activity: [{ at: new Date().toISOString(), kind: "Draft saved" }],
  };
  // Validate all PDF text fits before persisting a new revision.
  await generateDocument(o);
  const result = await db
    .from("firm_offers")
    .insert({ id: o.id, application_id: draft.applicationId, revision: o.revision, snapshot: o });
  if (result.error) throw new Error(result.error.message);
  return o;
}
export async function recipientOffer(token: string) {
  if (!/^[\w-]{43}$/.test(token)) throw new Error("This private link is unavailable or expired");
  const hashed = hash(token);
  const rate = await db.rpc("firm_offer_rate_limit", { _key: hashed });
  if (rate.error || !rate.data) throw new Error("Too many requests. Please wait a minute.");
  const { data, error } = await db
    .from("firm_offers")
    .select("snapshot,expires_at,revoked_at")
    .eq("token_hash", hashed)
    .maybeSingle();
  if (
    error ||
    !data ||
    data.revoked_at ||
    !data.expires_at ||
    Date.parse(data.expires_at) <= Date.now()
  )
    throw new Error("This private link is unavailable or expired");
  assertRecipientAccess(data.expires_at, data.revoked_at);
  return data.snapshot as Offer;
}
export function publicOffer(o: Offer) {
  // Deliberate DTO: no internal activity, provider IDs, paths, configuration or review notes.
  return {
    id: o.id,
    revision: o.revision,
    version: o.version,
    firmName: o.draft.firmName,
    contactName: o.draft.contactName,
    arrangement: o.draft.arrangement,
    priceCents: o.draft.priceCents,
    company: o.company,
    details: o.details,
    proposal: o.proposal,
    signature: o.signature,
    onboardingComplete: o.onboardingComplete,
    paused: o.paused,
    optedOut: o.optedOut,
    payments: o.payments.map((p) => ({
      block: p.block,
      status: p.status,
      amountCents: p.amountCents,
      dueDate: p.dueDate,
      url: p.url,
    })),
    hasSignedDocument: !!o.signedPath,
    hasCertificate: !!o.certificatePath,
  };
}
export async function claimOperation(o: Offer, key: string, kind: string) {
  const { error } = await db.from("firm_offer_operations").insert({ key, offer_id: o.id, kind });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}
export async function finishOperation(
  key: string,
  state: "succeeded" | "uncertain" | "failed",
  result: unknown = {},
) {
  const { error } = await db.from("firm_offer_operations").update({ state, result }).eq("key", key);
  if (error) throw new Error(error.message);
}
export async function privateUpload(path: string, bytes: Uint8Array) {
  const { error } = await db.storage
    .from("firm-offers")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error && !/already exists|Duplicate/i.test(error.message)) throw new Error(error.message);
}
export async function privateDownload(path: string) {
  const { data, error } = await db.storage.from("firm-offers").download(path);
  if (error || !data) throw new Error("Private document unavailable");
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}
export async function exchangeLink(token: string) {
  const o = await recipientOffer(token);
  const session = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();
  const { error } = await db
    .from("firm_offer_sessions")
    .insert({ token_hash: hash(session), offer_id: o.id, expires_at: expiresAt });
  if (error) throw new Error(error.message);
  return { session, expiresAt, offer: publicOffer(o) };
}
export async function recipientSession(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new Error("Session expired. Reopen your private invitation link.");
  const rate = await db.rpc("firm_offer_rate_limit", { _key: hash(token) });
  if (rate.error || !rate.data) throw new Error("Too many requests; wait a minute.");
  const { data, error } = await db
    .from("firm_offer_sessions")
    .select("offer_id,expires_at")
    .eq("token_hash", hash(token))
    .single();
  if (error || !data || Date.parse(data.expires_at) <= Date.now())
    throw new Error("Session expired. Reopen your private invitation link.");
  const row = await db
    .from("firm_offers")
    .select("snapshot,expires_at,revoked_at")
    .eq("id", data.offer_id)
    .single();
  if (
    row.error ||
    !row.data ||
    row.data.revoked_at ||
    Date.parse(row.data.expires_at) <= Date.now()
  )
    throw new Error("This offer is unavailable or expired");
  assertRecipientAccess(row.data.expires_at, row.data.revoked_at);
  return row.data.snapshot as Offer;
}

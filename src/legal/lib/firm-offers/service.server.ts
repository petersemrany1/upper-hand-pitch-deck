// Ported from the Legal app (family-law-floater/src/lib/firm-offers/service.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { randomUUID } from "node:crypto";
import {
  detailsSchema,
  pricing,
  initialInvitationAt,
  TEMPLATE_VERSION,
  canActivate,
  preparedFirmDetails,
  type Offer,
  type PaymentRequest,
} from "./model";
import { generateDocument } from "./documents.server";
import {
  annatureCall,
  assertSigningReady,
  configurationBlockers,
  signingConfigurationBlockers,
  createSigningEnvelope,
  paymentAdapter,
  safeProviderUrl,
  SquareFirmAdapter,
  type Envelope,
} from "./providers.server";
import {
  db,
  loadOffer,
  saveOffer,
  tokenFor,
  workspaceLink,
  hash,
  claimOperation,
  finishOperation,
  privateUpload,
  privateDownload,
} from "./store.server";
export async function preview(o: Offer) {
  const d = await generateDocument(o);
  return { pdf: Buffer.from(d.bytes).toString("base64"), digest: d.digest };
}
export async function approveSend(o: Offer) {
  if (o.proposal !== "draft") throw new Error("Only a draft can be sent");
  if (o.templateVersion !== TEMPLATE_VERSION)
    throw new Error("Save a new draft revision to use the current proposal wording before sending");
  const blockers = configurationBlockers();
  if (o.draft.reminderConsent !== true)
    blockers.push("Record permission for email/SMS reminders before sending");
  if (legalEnv["BOLD_TEMPLATE_APPROVED_VERSION"] !== TEMPLATE_VERSION)
    blockers.push(
      "BOLD_TEMPLATE_APPROVED_VERSION must match the reviewed combined template version",
    );
  if (blockers.length) throw new Error(`Sending blocked: ${blockers.join("; ")}`);
  // Sandbox allowlist prevents accidental real firm messages even with existing provider credentials.
  const allowed = (legalEnv["BOLD_TEST_RECIPIENT_EMAILS"] ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim());
  if (
    legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
    !allowed.includes(o.draft.email.toLowerCase())
  )
    throw new Error("Recipient must be in BOLD_TEST_RECIPIENT_EMAILS");
  if (legalEnv["BOLD_OFFERS_MODE"] === "sandbox") {
    if (
      !(legalEnv["BOLD_TEST_RECIPIENT_MOBILES"] ?? "")
        .split(",")
        .map((v) => v.trim())
        .includes(o.draft.mobile) ||
      !allowed.includes(o.company.email.toLowerCase())
    )
      throw new Error("Allowlist the test mobile and test countersigner email before sending");
  }
  await new SquareFirmAdapter().verifyLocation();
  const built = await generateDocument(o);
  await privateUpload(`${o.id}/${built.digest}.pdf`, built.bytes);
  const now = initialInvitationAt(new Date(), o.timezone);
  const next = await saveOffer(
    {
      ...o,
      proposal: "sent",
      sentAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
      documentPath: `${o.id}/${built.digest}.pdf`,
      documentDigest: built.digest,
    },
    "Invitation approved",
    undefined,
    hash(tokenFor(o)),
  );
  return { offer: next, link: workspaceLink(next) };
}
export async function confirmDetails(o: Offer, input: unknown) {
  if (o.draft.workflow === "call_signing")
    throw new Error("Firm details are prepared by Bold. Request a revision to change them.");
  if (o.proposal !== "sent" || o.signature !== "not_started")
    throw new Error("Firm details are frozen once signing starts; request a revision");
  const details = detailsSchema.parse(input);
  const allowed = (legalEnv["BOLD_TEST_RECIPIENT_EMAILS"] ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim());
  if (
    legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
    (!allowed.includes(details.signatoryEmail.toLowerCase()) ||
      !allowed.includes(details.billingEmail.toLowerCase()))
  )
    throw new Error("Sandbox signatory and billing emails must be allowlisted");
  const next = { ...o, details };
  const built = await generateDocument(next);
  await privateUpload(`${o.id}/${built.digest}.pdf`, built.bytes);
  return saveOffer(
    { ...next, documentPath: `${o.id}/${built.digest}.pdf`, documentDigest: built.digest },
    "Firm details confirmed",
  );
}
export async function beginSigning(o: Offer, reviewedDigest: string) {
  if (o.proposal !== "sent" || o.paused || !o.details || o.documentDigest !== reviewedDigest)
    throw new Error("Review the current populated document before signing");
  if (o.envelopeId) return signingLink(o, "firm");
  assertSigningReady(o);
  const built = await generateDocument(o);
  if (built.digest !== reviewedDigest) throw new Error("Document changed; review again");
  const key = `annature:${o.id}:${built.digest}`;
  if (!(await claimOperation(o, key, "envelope"))) {
    // Annature has no documented create idempotency key. Never blindly POST again.
    const result = await annatureCall<{ envelopes: { id: string }[]; has_more?: boolean }>(
      `/v2/envelopes?name=${encodeURIComponent(`Bold offer ${o.id} revision ${o.revision}`)}`,
    );
    // List/create responses can omit metadata. Retrieve each exact-name candidate
    // before verifying it; never treat an incomplete projection as a new envelope.
    if (result.has_more || result.envelopes.length > 10)
      throw new Error("Multiple signing records need review; no duplicate envelope was created.");
    const candidates = await Promise.all(
      result.envelopes.map((e) => retrieveSigningEnvelope(e.id)),
    );
    const matches = candidates.filter(
      (e) =>
        e.metadata?.["offer_id"] === o.id &&
        e.metadata?.["document_digest"] === built.digest &&
        e.metadata?.["revision"] === String(o.revision) &&
        e.account_id === legalEnv["BOLD_ANNATURE_ACCOUNT_ID"],
    );
    if (matches.length !== 1)
      throw new Error(
        "Signing creation outcome is uncertain. Admin reconciliation is required; no duplicate envelope was created.",
      );
    o = await attachEnvelope(await loadOffer(o.id), matches[0]!);
    await finishOperation(key, "succeeded", { envelopeId: matches[0]!.id });
    return signingLink(o, "firm");
  }
  try {
    o = await saveOffer({ ...o, signature: "pending" }, "Signing requested");
    const created = await createSigningEnvelope(o, built.bytes, built.fields);
    const envelope = await retrieveSigningEnvelope(created.id);
    o = await attachEnvelope(o, envelope);
    await finishOperation(key, "succeeded", { envelopeId: envelope.id });
    return signingLink(o, "firm");
  } catch (error) {
    await finishOperation(key, "uncertain");
    throw error;
  }
}
async function retrieveSigningEnvelope(id: string): Promise<Envelope> {
  if (typeof id !== "string" || !id)
    throw new Error(
      "Annature did not return an envelope ID. Retry to recover the existing agreement.",
    );
  for (let attempt = 0; ; attempt++) {
    const envelope = await annatureCall<Envelope>(`/v1/envelopes/${encodeURIComponent(id)}`);
    if (envelope.id !== id) throw new Error("Envelope identity mismatch");
    if (envelope.status !== "created" || attempt === 3) return envelope;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
}
async function attachEnvelope(o: Offer, e: Envelope) {
  if (
    e.account_id !== legalEnv["BOLD_ANNATURE_ACCOUNT_ID"] ||
    e.metadata?.["offer_id"] !== o.id ||
    e.metadata?.["revision"] !== String(o.revision) ||
    e.metadata?.["document_digest"] !== o.documentDigest
  )
    throw new Error("Envelope identity mismatch");
  if (!["created", "sent"].includes(e.status))
    throw new Error(
      "This Annature agreement is no longer available for signing. Review its status before continuing.",
    );
  const firm = e.recipients.find(
    (r) => r.order === 1 && r.email.toLowerCase() === o.details?.signatoryEmail.toLowerCase(),
  );
  const peter = e.recipients.find(
    (r) => r.order === 2 && r.email.toLowerCase() === o.company.email.toLowerCase(),
  );
  if (!firm || !peter) throw new Error("Both signing recipients are required");
  return saveOffer(
    { ...o, envelopeId: e.id, firmRecipientId: firm.id, peterRecipientId: peter.id },
    "Annature envelope attached",
  );
}
export async function signingLink(o: Offer, party: "firm" | "peter") {
  if (o.proposal !== "sent" || o.paused) throw new Error("This agreement is on hold");
  if (party === "peter" && o.signature !== "awaiting_peter")
    throw new Error("Firm signature must complete first");
  if (party === "firm" && o.signature !== "pending") throw new Error("Firm signing is not due");
  const id = party === "firm" ? o.firmRecipientId : o.peterRecipientId;
  if (!id) throw new Error("Signing session is preparing; refresh shortly");
  const result = await annatureCall<{ endpoint: string; expiration: string }>(
    `/v1/recipients/${encodeURIComponent(id)}/token?token_duration=1`,
  );
  return {
    url: safeProviderUrl(result.endpoint, ["annature.com.au"]),
    expiresAt: result.expiration,
  };
}
export async function prepareCallSigning(o: Offer, reviewedDigest: string) {
  if (o.draft.workflow !== "call_signing")
    throw new Error("Save a new proposal using the preparation form first");
  if (!["draft", "sent"].includes(o.proposal) || o.paused)
    throw new Error("This proposal is on hold");
  const blockers = signingConfigurationBlockers();
  if (blockers.length) throw new Error(`Signing setup needed: ${blockers.join("; ")}`);
  const details = preparedFirmDetails(o.draft);
  if (
    Object.entries(details).some(
      ([key, value]) => o.details?.[key as keyof typeof details] !== value,
    )
  )
    throw new Error("Save the firm details again before signing");
  const built = await generateDocument(o);
  if (built.digest !== reviewedDigest)
    throw new Error("Preview the current PDF before creating its signing link");
  // An existing envelope already contains the approved, frozen document. A new
  // template release must not prevent retrieving that agreement's signing link.
  if (o.envelopeId) {
    const result = await beginSigning(o, reviewedDigest);
    return { link: result.url, expiresAt: result.expiresAt };
  }
  assertSigningReady(o);
  if (legalEnv["BOLD_OFFERS_MODE"] === "sandbox") {
    const allowed = (legalEnv["BOLD_TEST_RECIPIENT_EMAILS"] ?? "")
      .toLowerCase()
      .split(",")
      .map((s) => s.trim());
    if (
      !allowed.includes(details.signatoryEmail.toLowerCase()) ||
      !allowed.includes(o.company.email.toLowerCase())
    )
      throw new Error("Allowlist the test signer and countersigner emails before creating a link");
  }
  if (o.proposal === "draft") {
    await privateUpload(`${o.id}/${built.digest}.pdf`, built.bytes);
    o = await saveOffer(
      {
        ...o,
        proposal: "sent",
        sentAt: new Date().toISOString(),
        documentPath: `${o.id}/${built.digest}.pdf`,
        documentDigest: built.digest,
      },
      "Signing link requested after PDF review",
    );
  }
  const result = await beginSigning(o, reviewedDigest);
  return { link: result.url, expiresAt: result.expiresAt };
}
export async function requestInvoice(o: Offer, block: 1 | 2, dueDate?: string) {
  if (o.signature !== "executed") throw new Error("Both signatures must be complete");
  if (o.payments.some((p) => p.block === block && p.invoiceId)) return o;
  if (block === 2 && (o.draft.arrangement !== "split" || !dueDate))
    throw new Error("Verified fifth-show milestone required");
  const amount = pricing(o.draft.priceCents, o.draft.arrangement);
  let p = o.payments.find((p) => p.block === block);
  if (!p) {
    p = {
      id: randomUUID(),
      block,
      paymentProvider: "square",
      amountCents: amount.blockCents,
      status: "not_requested",
      dueDate: dueDate ?? new Date().toISOString().slice(0, 10),
    };
    o = await saveOffer({ ...o, payments: [...o.payments, p] }, `Block ${block} request prepared`);
  }
  const key = `invoice:${p.id}`;
  // Square retries are safe with persisted request identity and identical request bodies.
  await claimOperation(o, key, "invoice");
  // Replaying a claimed operation after a crash is safe here: every Square POST
  // uses the same persisted request id and immutable payload, including publish.
  try {
    const updated = await paymentAdapter(p.paymentProvider).create(o, p);
    o = await saveOffer(
      { ...o, payments: o.payments.map((x) => (x.id === p!.id ? updated : x)) },
      `Block ${block} invoice ready`,
    );
    await finishOperation(key, "succeeded");
    return o;
  } catch (error) {
    await finishOperation(key, "uncertain");
    throw error;
  }
}
export async function requestChange(o: Offer, note: string) {
  if (!note.trim() || note.length > 2000)
    throw new Error("Describe the requested change (up to 2,000 characters)");
  return saveOffer({ ...o, paused: true }, "Change requested", note);
}
export async function adminAction(
  o: Offer,
  action: string,
  userId: string,
  note?: string,
  digest?: string,
) {
  if (action === "signing_link") return prepareCallSigning(o, digest ?? "");
  if (action === "signed" || action === "certificate") return downloadDocument(o, action);
  if (action === "send") {
    if (o.draft.workflow === "call_signing")
      throw new Error("Use Create signing link for this proposal");
    return approveSend(o);
  }
  if (action === "preview") return preview(o);
  if (action === "link") {
    if (o.draft.workflow === "call_signing")
      throw new Error("Use Create signing link for this proposal");
    if (o.proposal !== "sent") throw new Error("Send this offer first");
    return { link: workspaceLink(o) };
  }
  if (action === "countersign") {
    if (userId !== legalEnv["BOLD_COUNTERSIGNER_USER_ID"])
      throw new Error("Only the configured countersigner can sign for Bold");
    return signingLink(o, "peter");
  }
  if (action === "pause")
    return { offer: await saveOffer({ ...o, paused: true }, "Reminders paused") };
  if (action === "resume")
    return { offer: await saveOffer({ ...o, paused: false }, "Eligible reminders resumed") };
  if (action === "withdraw" || action === "revision") {
    if (o.signature === "executed" || o.signature === "awaiting_peter")
      throw new Error("Signed terms require a reviewed agreement-change process");
    if (o.signature === "pending") {
      if (!o.envelopeId)
        throw new Error("Resolve the uncertain envelope creation before withdrawing");
      const e = await annatureCall<Envelope>(`/v1/envelopes/${encodeURIComponent(o.envelopeId)}`);
      if (
        e.account_id !== legalEnv["BOLD_ANNATURE_ACCOUNT_ID"] ||
        e.metadata["offer_id"] !== o.id
      )
        throw new Error("Envelope identity mismatch");
      if (e.recipients.some((r) => r.status === "completed"))
        throw new Error("A party has signed; a reviewed agreement-change process is required");
      // Void first. If the provider response is lost, a retry retrieves the voided state.
      if (e.status !== "voided")
        await annatureCall(`/v1/envelopes/${encodeURIComponent(o.envelopeId)}/void`, "POST", {});
    }
    return {
      offer: await saveOffer(
        {
          ...o,
          proposal: action === "withdraw" ? "withdrawn" : "revision_requested",
          paused: true,
        },
        action === "withdraw" ? "Offer withdrawn" : "Revision requested",
        note,
      ),
    };
  }
  if (action === "onboarding") {
    if (o.signature !== "executed" || o.payments[0]?.status !== "paid")
      throw new Error("Complete signatures and payment first");
    return {
      offer: await saveOffer({ ...o, onboardingComplete: true }, "Onboarding call completed", note),
    };
  }
  throw new Error("Unsupported offer action");
}
export async function downloadDocument(o: Offer, kind: "preview" | "signed" | "certificate") {
  const path =
    kind === "signed" ? o.signedPath : kind === "certificate" ? o.certificatePath : o.documentPath;
  if (!path) throw new Error("Document is not available yet");
  return { pdf: await privateDownload(path), digest: o.documentDigest };
}
export async function activatePack(o: Offer, firmId: string) {
  if (!canActivate(o)) throw new Error("Signatures, payment and onboarding must be complete");
  const { data, error } = await db.rpc("activate_firm_offer_pack", {
    _offer_id: o.id,
    _firm_id: firmId,
  });
  if (error) throw new Error(error.message);
  await saveOffer(o, "Funded pack activated", `Verified firm record ${firmId}`);
  return data;
}

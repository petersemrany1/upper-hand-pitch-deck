import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  checkInvoice,
  INVOICE_EMAIL,
  type InvoiceClaim,
  type InvoiceEvidence,
  type InvoiceCheck,
} from "./invoice-check";

export type InvoiceRow = {
  id: string;
  rep_id: string;
  invoice_number: string;
  period_from: string;
  period_to: string;
  claim: InvoiceClaim;
  evidence: InvoiceEvidence;
  result: InvoiceCheck | null;
  status: "checking" | "approved" | "needs_review";
  email_status: string;
  email_error: string | null;
  created_at: string;
};
async function actor(email: unknown) {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  if (typeof email !== "string" || !email)
    throw new Error("Sign in to access invoices.");
  const { data: rep, error } = await supabaseAdmin
    .from("sales_reps")
    .select("id,name,role,is_active")
    .eq("email", email)
    .maybeSingle();
  if (
    error ||
    !rep ||
    !rep.is_active ||
    !["rep", "admin"].includes(rep.role ?? "")
  )
    throw new Error("Invoice access is not available for this account.");
  // New tables are introduced by the accompanying migration.
  return { rep, db: supabaseAdmin as unknown as SupabaseClient };
}
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  );
const amount = z
  .number()
  .finite()
  .nonnegative()
  .max(100000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-7,
    "Use at most two decimal places",
  );
const claimSchema = z
  .object({
    number: z.string().trim().min(1).max(80),
    from: day,
    to: day,
    hours: amount.refine((n) => n <= 168, "Hours cannot exceed a week"),
    bookings: z.number().int().min(0).max(10000),
    hourlyRate: amount,
    bookingRate: amount,
    total: amount,
  })
  .refine(
    (c) =>
      Date.parse(c.to) >= Date.parse(c.from) &&
      Date.parse(c.to) - Date.parse(c.from) < 7 * 86400000,
    "Select up to seven invoice dates",
  );
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const money = (c: number | null) =>
  c == null ? "Unavailable" : `$${(c / 100).toFixed(2)}`;

// Delivery status is durable; failure is visible and retryable. The fixed
// recipient cannot be overridden by a rep or by text inside an uploaded PDF.
async function deliverInvoice(db: SupabaseClient, id: string) {
  const { data: row, error } = await db
    .from("rep_invoices")
    .update({
      email_status: "sending",
      email_error: null,
      email_attempt_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("email_status", ["pending", "failed"])
    .neq("status", "checking")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return;
  try {
    const { data: file, error: fileError } = await db.storage
      .from("rep-invoices")
      .download(row.file_path);
    if (fileError || !file)
      throw new Error("Could not attach the saved invoice.");
    const r = row.result as InvoiceCheck;
    const c = row.claim as InvoiceClaim;
    const e = row.evidence as InvoiceEvidence;
    const verdict =
      row.status === "approved"
        ? "Approved — ready to pay"
        : "Needs review — do not pay automatically";
    const rows = [
      ["Hours (breaks included)", c.hours, r.systemHours],
      ["Deposit-paid bookings", c.bookings, r.systemBookings],
      [
        "Hourly rate",
        money(Math.round(c.hourlyRate * 100)),
        money(e.hourly_rate_cents),
      ],
      ["Booking rate", money(Math.round(c.bookingRate * 100)), "$50.00"],
      ["Total", money(r.claimedTotalCents), money(r.expectedTotalCents)],
    ];
    const html = `<div style="font-family:Arial,sans-serif;color:#18231c;line-height:1.6"><h2>${esc(verdict)}</h2><p>${esc(e.rep_name)} · Invoice ${esc(c.number)}<br>${esc(c.from)} to ${esc(c.to)} (WA dates)</p><table cellpadding="8" border="1" style="border-collapse:collapse"><tr><th>Check</th><th>Invoice</th><th>System</th></tr>${rows.map((a) => `<tr>${a.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table><p>Difference: ${esc(money(r.differenceCents))}</p>${r.reasons.length ? `<ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p>The PDF figures, recorded session hours, booking records and agreed rates match. No duplicate or overlapping invoice was found.</p>"}<p>The original invoice is attached. Open the Invoices tab in your portal for session and booking evidence. This check does not transfer money.</p><p>Checked ${esc(e.captured_at)}. Hours rounded once to two decimal places; payments calculated in cents.</p></div>`;
    const key = process.env.RESEND_API_KEY,
      gateway = process.env.LOVABLE_API_KEY;
    if (!key || !gateway)
      throw new Error("Email service credentials are missing.");
    const response = await fetch(
      "https://connector-gateway.lovable.dev/resend/emails",
      {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          "X-Connection-Api-Key": key,
          "Lovable-API-Key": gateway,
          "Idempotency-Key": `rep-invoice-${id}`,
        },
        body: JSON.stringify({
          from: "Bold Patients <admin@bold-patients.com>",
          to: [INVOICE_EMAIL],
          subject: `${verdict}: ${e.rep_name} — ${c.number}`,
          html,
          attachments: [
            {
              filename: "invoice.pdf",
              content: Buffer.from(await file.arrayBuffer()).toString("base64"),
            },
          ],
        }),
      },
    );
    if (!response.ok)
      throw new Error(`Email delivery failed (${response.status}).`);
    const receipt = (await response.json()) as { id?: string };
    if (!receipt.id)
      throw new Error("Email service did not return a delivery receipt.");
    const { error: updateError } = await db
      .from("rep_invoices")
      .update({ email_status: "sent", email_sent_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError)
      throw new Error(
        "Email accepted, but its delivery status could not be saved. Check before retrying.",
      );
  } catch (error) {
    const { error: saveError } = await db
      .from("rep_invoices")
      .update({
        email_status: "failed",
        email_error: error instanceof Error ? error.message : "Email failed",
      })
      .eq("id", id);
    if (saveError)
      throw new Error(
        "Could not save email failure status. Check delivery before retrying.",
      );
  }
}

export const listRepInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, rep } = await actor(context.claims.email);
    let query = db
      .from("rep_invoices")
      .select(
        "id,rep_id,invoice_number,period_from,period_to,claim,evidence,result,status,email_status,email_error,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (rep.role !== "admin") query = query.eq("rep_id", rep.id);
    const [{ data, error }, { data: config, error: configError }] =
      await Promise.all([
        query,
        db
          .from("rep_invoice_config")
          .select("hourly_rate_cents")
          .eq("rep_id", rep.id)
          .maybeSingle(),
      ]);
    if (error || configError)
      throw new Error(
        "Invoices are not ready. The invoice database migration must be applied successfully.",
      );
    return {
      invoices: data as InvoiceRow[],
      name: rep.name,
      isAdmin: rep.role === "admin",
      hourlyRate: config?.hourly_rate_cents
        ? config.hourly_rate_cents / 100
        : null,
    };
  });

export const submitRepInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ claim: claimSchema, pdf: z.string().min(1).max(6990508) }),
  )
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    if (rep.role !== "rep")
      throw new Error("Submit invoices from the rep’s own account.");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data.pdf))
      throw new Error("Invalid PDF upload.");
    const bytes = Buffer.from(data.pdf, "base64");
    if (bytes.length > 5242880 || bytes.subarray(0, 5).toString() !== "%PDF-")
      throw new Error("Upload a PDF no larger than 5 MB.");
    const id = crypto.randomUUID(),
      path = `${rep.id}/${id}.pdf`;
    const hash = Buffer.from(
      await crypto.subtle.digest("SHA-256", bytes),
    ).toString("hex");
    const { error: uploadError } = await db.storage
      .from("rep-invoices")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError)
      throw new Error("Could not save the invoice PDF. Please retry.");
    const { data: evidence, error } = await db.rpc("submit_rep_invoice", {
      p_id: id,
      p_rep: rep.id,
      p_claim: data.claim,
      p_path: path,
      p_hash: hash,
    });
    if (error) {
      throw new Error(
        "Submission could not be confirmed. Refresh the invoice list before retrying; the PDF has been retained.",
      );
    }
    let result: InvoiceCheck;
    try {
      const { checkInvoicePdf } = await import("./invoice-pdf.server");
      const issues = await checkInvoicePdf(bytes, data.claim, rep.name);

      result = checkInvoice(data.claim, evidence, issues);
    } catch {
      result = {
        status: "needs_review",
        reasons: [
          "The automatic check could not complete. Verify the PDF, hours and bookings manually.",
        ],
        systemHours: 0,
        systemBookings: 0,
        expectedTotalCents: null,
        claimedTotalCents: Math.round(data.claim.total * 100),
        differenceCents: null,
      };
    }
    const { error: saveError } = await db
      .from("rep_invoices")
      .update({ status: result.status, result })
      .eq("id", id)
      .eq("status", "checking");
    if (saveError)
      throw new Error(
        "Invoice saved, but checking could not finish. Do not resubmit; ask an admin to recover this check.",
      );
    await deliverInvoice(db, id);
    return { id };
  });

export const invoiceFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    let q = db.from("rep_invoices").select("file_path").eq("id", data.id);
    if (rep.role !== "admin") q = q.eq("rep_id", rep.id);
    const { data: row, error } = await q.maybeSingle();
    if (error || !row) throw new Error("Invoice not found.");
    const { data: url, error: urlError } = await db.storage
      .from("rep-invoices")
      .createSignedUrl(row.file_path, 120);
    if (urlError) throw new Error("Could not open invoice.");
    return url.signedUrl as string;
  });
export const retryInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    if (rep.role !== "admin") throw new Error("Admin access required.");
    // Recover a terminated request only after its delivery lease has expired.
    const { error: resetError } = await db
      .from("rep_invoices")
      .update({
        email_status: "failed",
        email_error: "Previous email attempt was interrupted.",
      })
      .eq("id", data.id)
      .eq("email_status", "sending")
      .lt("email_attempt_at", new Date(Date.now() - 5 * 60000).toISOString());
    if (resetError) throw new Error("Could not recover email delivery.");
    await deliverInvoice(db, data.id);
    return { ok: true };
  });

export const recoverInvoiceCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    if (rep.role !== "admin") throw new Error("Admin access required.");
    const { data: row, error } = await db
      .from("rep_invoices")
      .select("*")
      .eq("id", data.id)
      .eq("status", "checking")
      .lt("created_at", new Date(Date.now() - 5 * 60000).toISOString())
      .maybeSingle();
    if (error || !row)
      throw new Error(
        "Only an incomplete check older than five minutes can be recovered.",
      );
    const { data: file, error: fileError } = await db.storage
      .from("rep-invoices")
      .download(row.file_path);
    if (fileError || !file)
      throw new Error(
        "The original PDF is unavailable. The invoice remains unapproved.",
      );
    const { checkInvoicePdf } = await import("./invoice-pdf.server");
    const issues = await checkInvoicePdf(
      new Uint8Array(await file.arrayBuffer()),
      row.claim,
      row.evidence.rep_name,
    );
    const result = checkInvoice(row.claim, row.evidence, issues);
    const { error: saveError } = await db
      .from("rep_invoices")
      .update({ result, status: result.status })
      .eq("id", data.id)
      .eq("status", "checking");
    if (saveError) throw new Error("Could not save the recovered check.");
    await deliverInvoice(db, data.id);
    return { ok: true };
  });

// The personal upload log is the private storage object's durable metadata.
// Owner prefixes always come from the authenticated account, never the request.
export const listPersonalInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ offset: z.number().int().min(0).max(100000) }))
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    const { data: files, error } = await db.storage
      .from("rep-invoices")
      .list(rep.id, {
        limit: 26,
        offset: data.offset,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (error)
      throw new Error("Could not load your invoices. Please try again.");
    return {
      hasMore: files.length > 25,
      invoices: files.slice(0, 25).map((file) => ({
        key: file.name,
        name: file.name.includes("--")
          ? file.name.slice(file.name.indexOf("--") + 2)
          : "Invoice.pdf",
        createdAt: file.created_at,
      })),
    };
  });

export const uploadPersonalInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().min(1).max(255),
      pdf: z.string().min(1).max(6990508),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data.pdf))
      throw new Error("Invalid PDF upload.");
    const bytes = Buffer.from(data.pdf, "base64");
    if (bytes.length > 5242880 || bytes.subarray(0, 5).toString() !== "%PDF-")
      throw new Error("Choose a PDF no larger than 5 MB.");
    const name = data.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180);
    const key = `${crypto.randomUUID()}--${name}`;
    const { error } = await db.storage
      .from("rep-invoices")
      .upload(`${rep.id}/${key}`, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error)
      throw new Error(
        "Upload could not be confirmed. Refresh your history before trying again.",
      );
    return { key };
  });

export const personalInvoiceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      key: z
        .string()
        .min(1)
        .max(255)
        .regex(/^[a-zA-Z0-9._ -]+$/),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, rep } = await actor(context.claims.email);
    const { data: url, error } = await db.storage
      .from("rep-invoices")
      .createSignedUrl(`${rep.id}/${data.key}`, 120);
    if (error || !url) throw new Error("Could not open your invoice.");
    return url.signedUrl;
  });

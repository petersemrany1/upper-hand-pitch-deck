// Ported from the Legal app (family-law-floater/src/lib/cold-calling/cold-calling.functions.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireColdCallingAccess } from "@/legal/lib/portal-access-middleware";

import type { DispositionInput } from "./dispositions";
import type { ImportRow } from "./import";
import { DISPOSITIONS, type Disposition } from "./types";

// Every mutation for the Firm Cold Call Portal. Reads happen in the browser
// under RLS; writes go through here so suppression, calling-window and
// one-live-call checks cannot be skipped from the client.

type Ctx = { supabase: unknown; userId: string };
type Db = import("./cold-calling.server").Db;

async function roleOf(ctx: Ctx) {
  const sb = ctx.supabase as Db;
  const [admin, staff, rep] = await Promise.all([
    sb.rpc("is_admin_user"),
    sb.rpc("has_sales_role"),
    sb.rpc("current_sales_rep_id"),
  ]);
  return {
    isAdmin: admin.data === true,
    isStaff: staff.data === true || admin.data === true,
    repId: typeof rep.data === "string" ? rep.data : null,
  };
}
async function requireAdmin(ctx: Ctx) {
  const role = await roleOf(ctx);
  if (!role.isAdmin) throw new Error("Admins only");
  return role;
}
async function requireStaff(ctx: Ctx) {
  const role = await roleOf(ctx);
  if (!role.isStaff)
    throw new Error("You need an active advisor profile to use the Firm Cold Call Portal");
  return role;
}
const server = () => import("./cold-calling.server");
const uuid = z.string().uuid();

// ---------------------------------------------------------------- import ----

const importRowSchema = z.object({
  rowNumber: z.number().int(),
  firm: z.record(z.unknown()),
  contacts: z.array(z.record(z.unknown())),
  warnings: z.array(z.string()),
});

export type ImportChunkResult = {
  batchId: string | null;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  rowResults: Array<{
    rowNumber: number;
    outcome: "inserted" | "updated" | "skipped" | "failed";
    message: string | null;
  }>;
};

/**
 * Commit (or dry-run) a chunk of validated import rows. Admin only.
 * Works in bulk: a few queries per chunk instead of several per row, so a
 * chunk finishes well inside the server function's time limit. Idempotent —
 * re-running a chunk after a dropped request updates instead of duplicating.
 */
export const importProspectsFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator(
    (input: {
      rows: Array<Extract<ImportRow, { ok: true }>>;
      fileName: string;
      dryRun: boolean;
      batchId: string | null;
      totalRows: number;
      failedRows: number;
    }) =>
      z
        .object({
          rows: z.array(importRowSchema).max(250),
          fileName: z.string().max(300),
          dryRun: z.boolean(),
          batchId: uuid.nullable(),
          totalRows: z.number().int().min(0),
          failedRows: z.number().int().min(0),
        })
        .parse(input),
  )
  .handler(async ({ data, context }): Promise<ImportChunkResult> => {
    await requireAdmin(context as Ctx);
    const { privilegedClient, audit } = await server();
    const { mergeFirmPatch, firmMatchKey } = await import("./import");
    const { phoneTail } = await import("./normalise");
    const db = await privilegedClient(context.supabase as never);
    type FirmRec = import("./import").ImportFirmRecord;
    type ContactRec = import("./import").ImportContactRecord;

    let batchId = data.batchId;
    if (!data.dryRun && !batchId) {
      const { data: batch, error } = await db
        .from("prospect_import_batches")
        .insert({
          file_name: data.fileName,
          mode: "commit",
          created_by: context.userId,
          total_rows: data.totalRows,
          failed_count: data.failedRows,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      batchId = batch.id;
    }
    const result: ImportChunkResult = {
      batchId,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      rowResults: [],
    };

    // 1. Dedupe within the chunk.
    const seen = new Set<string>();
    const rows: Array<{
      rowNumber: number;
      firm: FirmRec;
      contacts: ContactRec[];
      warnings: string[];
    }> = [];
    for (const row of data.rows) {
      const firm = row.firm as FirmRec;
      const key = firmMatchKey(firm);
      if (seen.has(key)) {
        result.skipped += 1;
        result.rowResults.push({
          rowNumber: row.rowNumber,
          outcome: "skipped",
          message: "Duplicate of an earlier row in this file (same domain or number).",
        });
        continue;
      }
      seen.add(key);
      rows.push({
        rowNumber: row.rowNumber,
        firm,
        contacts: row.contacts as ContactRec[],
        warnings: row.warnings,
      });
    }

    // 2. Preload matches and suppressions for the whole chunk (3–4 queries).
    const domains = rows.map((r) => r.firm.root_domain).filter((v): v is string => !!v);
    const recordIds = rows.map((r) => r.firm.source_record_id).filter((v): v is string => !!v);
    const phones = rows.map((r) => r.firm.phone_e164).filter((v): v is string => !!v);
    const [byDomain, byRecord, byPhone, suppressed] = await Promise.all([
      domains.length
        ? db.from("prospect_firms").select("*").in("root_domain", domains)
        : Promise.resolve({ data: [], error: null }),
      recordIds.length
        ? db.from("prospect_firms").select("*").in("source_record_id", recordIds)
        : Promise.resolve({ data: [], error: null }),
      phones.length
        ? db.from("prospect_firms").select("*").in("phone_e164", phones)
        : Promise.resolve({ data: [], error: null }),
      phones.length
        ? db
            .from("phone_suppressions")
            .select("phone_e164, phone_tail")
            .in("phone_tail", phones.map(phoneTail))
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const q of [byDomain, byRecord, byPhone, suppressed])
      if (q.error) throw new Error(q.error.message);
    const domainMap = new Map((byDomain.data ?? []).map((f) => [f.root_domain, f]));
    const recordMap = new Map((byRecord.data ?? []).map((f) => [f.source_record_id, f]));
    const phoneMap = new Map((byPhone.data ?? []).map((f) => [f.phone_e164, f]));
    const suppressedTails = new Set((suppressed.data ?? []).map((s) => s.phone_tail));

    // 3. Classify.
    type Existing = NonNullable<typeof byDomain.data>[number];
    const toInsert: Array<(typeof rows)[number]> = [];
    const toUpdate: Array<{
      row: (typeof rows)[number];
      existing: Existing;
      patch: Record<string, unknown>;
    }> = [];
    for (const row of rows) {
      const f = row.firm;
      const existing =
        (f.root_domain && domainMap.get(f.root_domain)) ||
        (f.source_record_id && recordMap.get(f.source_record_id)) ||
        (!f.root_domain && f.phone_e164 && phoneMap.get(f.phone_e164)) ||
        null;
      const isSuppressed = !!f.phone_e164 && suppressedTails.has(phoneTail(f.phone_e164));
      if (!existing) {
        if (isSuppressed) {
          result.skipped += 1;
          result.rowResults.push({
            rowNumber: row.rowNumber,
            outcome: "skipped",
            message: "Number is on the Do Not Contact list — not imported as callable.",
          });
          continue;
        }
        toInsert.push(row);
      } else {
        toUpdate.push({
          row,
          existing,
          patch: mergeFirmPatch(existing as Record<string, unknown>, f),
        });
        if (isSuppressed)
          row.warnings.push(
            "Number is on the Do Not Contact list — research updated, still not callable.",
          );
      }
    }

    if (data.dryRun) {
      for (const row of toInsert) {
        result.inserted += 1;
        result.rowResults.push({
          rowNumber: row.rowNumber,
          outcome: "inserted",
          message: row.warnings.join(" ") || null,
        });
      }
      for (const { row } of toUpdate) {
        result.updated += 1;
        result.rowResults.push({
          rowNumber: row.rowNumber,
          outcome: "updated",
          message: row.warnings.join(" ") || null,
        });
      }
      return result;
    }

    // 4. Insert new firms in one statement; fall back to per-row on failure so one bad row never sinks the chunk.
    const firmIdByRow = new Map<number, string>();
    const insertPayload = (row: (typeof rows)[number]) => {
      const { import_dnc, ...insertable } = row.firm;
      return {
        ...insertable,
        import_batch_id: batchId,
        ...(import_dnc
          ? {
              do_not_contact: true,
              do_not_contact_reason: "Marked do-not-contact in the imported data",
              do_not_contact_by: context.userId,
            }
          : {}),
      };
    };
    if (toInsert.length > 0) {
      const { data: created, error } = await db
        .from("prospect_firms")
        .insert(toInsert.map(insertPayload))
        .select("id, root_domain, source_record_id, phone_e164");
      if (!error && created) {
        for (const row of toInsert) {
          const c = created.find(
            (x) =>
              (row.firm.root_domain && x.root_domain === row.firm.root_domain) ||
              (row.firm.source_record_id && x.source_record_id === row.firm.source_record_id) ||
              (!row.firm.root_domain && x.phone_e164 === row.firm.phone_e164),
          );
          if (c) firmIdByRow.set(row.rowNumber, c.id);
        }
      } else {
        for (const row of toInsert) {
          const { data: c, error: e } = await db
            .from("prospect_firms")
            .insert(insertPayload(row))
            .select("id")
            .single();
          if (e || !c) {
            result.failed += 1;
            result.rowResults.push({
              rowNumber: row.rowNumber,
              outcome: "failed",
              message: e?.message ?? "Insert failed",
            });
            continue;
          }
          firmIdByRow.set(row.rowNumber, c.id);
        }
      }
      for (const row of toInsert) {
        if (!firmIdByRow.has(row.rowNumber)) {
          if (!result.rowResults.some((r) => r.rowNumber === row.rowNumber)) {
            result.failed += 1;
            result.rowResults.push({
              rowNumber: row.rowNumber,
              outcome: "failed",
              message: "Inserted row could not be matched back",
            });
          }
          continue;
        }
        result.inserted += 1;
        result.rowResults.push({
          rowNumber: row.rowNumber,
          outcome: "inserted",
          message: row.warnings.join(" ") || null,
        });
      }
    }

    // 5. Update existing firms (only those with a real change), a few at a time.
    for (let i = 0; i < toUpdate.length; i += 10) {
      await Promise.all(
        toUpdate.slice(i, i + 10).map(async ({ row, existing, patch }) => {
          if (Object.keys(patch).length > 0) {
            const { error } = await db
              .from("prospect_firms")
              .update(patch as never)
              .eq("id", existing.id);
            if (error) {
              result.failed += 1;
              result.rowResults.push({
                rowNumber: row.rowNumber,
                outcome: "failed",
                message: error.message,
              });
              return;
            }
          }
          firmIdByRow.set(row.rowNumber, existing.id);
          result.updated += 1;
          result.rowResults.push({
            rowNumber: row.rowNumber,
            outcome: "updated",
            message: row.warnings.join(" ") || null,
          });
        }),
      );
    }

    // 6. Contacts: one read, one bulk insert, parallel updates, then primary-contact links.
    const firmIds = [...new Set(firmIdByRow.values())];
    const { data: existingContacts } = firmIds.length
      ? await db
          .from("prospect_contacts")
          .select("id, prospect_firm_id, full_name")
          .in("prospect_firm_id", firmIds)
      : { data: [] };
    const contactKey = (firmId: string, name: string) => `${firmId}|${name.trim().toLowerCase()}`;
    const contactIdByKey = new Map(
      (existingContacts ?? []).map((c) => [contactKey(c.prospect_firm_id, c.full_name), c.id]),
    );
    const contactInserts: Array<ContactRec & { prospect_firm_id: string }> = [];
    const contactUpdates: Array<{ id: string; patch: Record<string, unknown> }> = [];
    const primaryByFirm = new Map<string, string>(); // firmId → contact key
    for (const row of rows) {
      const firmId = firmIdByRow.get(row.rowNumber);
      if (!firmId) continue;
      for (const contact of row.contacts) {
        const key = contactKey(firmId, contact.full_name);
        const existingId = contactIdByKey.get(key);
        if (existingId)
          contactUpdates.push({
            id: existingId,
            patch: Object.fromEntries(
              Object.entries(contact).filter(([, v]) => v !== null && v !== ""),
            ),
          });
        else contactInserts.push({ ...contact, prospect_firm_id: firmId });
        if (contact.is_primary_decision_maker) primaryByFirm.set(firmId, key);
      }
    }
    if (contactInserts.length > 0) {
      const { data: created, error } = await db
        .from("prospect_contacts")
        .insert(contactInserts)
        .select("id, prospect_firm_id, full_name");
      if (error) {
        for (const c of contactInserts) {
          const { data: one } = await db
            .from("prospect_contacts")
            .insert(c)
            .select("id, prospect_firm_id, full_name")
            .single();
          if (one) contactIdByKey.set(contactKey(one.prospect_firm_id, one.full_name), one.id);
        }
      } else
        for (const c of created ?? [])
          contactIdByKey.set(contactKey(c.prospect_firm_id, c.full_name), c.id);
    }
    for (let i = 0; i < contactUpdates.length; i += 10) {
      await Promise.all(
        contactUpdates.slice(i, i + 10).map(({ id, patch }) =>
          db
            .from("prospect_contacts")
            .update(patch as never)
            .eq("id", id),
        ),
      );
    }
    const primaryLinks = [...primaryByFirm.entries()]
      .map(([firmId, key]) => ({ firmId, contactId: contactIdByKey.get(key) }))
      .filter((l): l is { firmId: string; contactId: string } => !!l.contactId);
    for (let i = 0; i < primaryLinks.length; i += 10) {
      await Promise.all(
        primaryLinks
          .slice(i, i + 10)
          .map((l) =>
            db
              .from("prospect_firms")
              .update({ primary_contact_id: l.contactId })
              .eq("id", l.firmId),
          ),
      );
    }

    // 6b. Any imported firm that already applied through Meta ads is withdrawn straight away.
    let withdrawn = 0;
    try {
      const { withdrawAppliedAmong } = await import("./applicants.server");
      withdrawn = await withdrawAppliedAmong(db, [...firmIdByRow.values()], context.userId);
    } catch (e) {
      console.error("[cold-calling] applicant check after import failed", e);
    }

    // 7. Batch bookkeeping.
    if (batchId) {
      const { data: batch } = await db
        .from("prospect_import_batches")
        .select("inserted_count, updated_count, skipped_count, failed_count, row_errors")
        .eq("id", batchId)
        .single();
      const errors = (batch?.row_errors as unknown[] | null) ?? [];
      await db
        .from("prospect_import_batches")
        .update({
          inserted_count: (batch?.inserted_count ?? 0) + result.inserted,
          updated_count: (batch?.updated_count ?? 0) + result.updated,
          skipped_count: (batch?.skipped_count ?? 0) + result.skipped,
          failed_count: (batch?.failed_count ?? 0) + result.failed,
          row_errors: [
            ...errors,
            ...result.rowResults.filter((r) => r.outcome === "skipped" || r.outcome === "failed"),
          ] as never,
        })
        .eq("id", batchId);
      await audit(db, context.userId, "import_chunk", null, {
        ...result,
        rowResults: undefined,
        withdrawnMetaApplicants: withdrawn,
      });
    }
    return result;
  });

// --------------------------------------------------- daily phone assignment ----

async function loadAssignment(db: Db, userId: string, workDate: string) {
  const { data, error } = await db
    .from("daily_phone_assignments")
    .select("*")
    .eq("caller_user_id", userId)
    .eq("work_date", workDate)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Reuse today's number or pick the least-recently-used active pool number. Fully automatic. */
async function resolveAssignment(db: Db, userId: string) {
  const { sydneyWorkDate, chooseCallerId } = await import("./daily-phone");
  const workDate = sydneyWorkDate();
  const existing = await loadAssignment(db, userId, workDate);
  const { data: numbers, error: numbersError } = await db
    .from("phone_numbers")
    .select(
      "id, number, status, can_receive_return_calls, verified_with_twilio, last_assigned_at, created_at",
    );
  if (numbersError) throw new Error(numbersError.message);
  const chosen = chooseCallerId(numbers ?? [], existing?.outbound_caller_id_id);
  if (!chosen)
    throw new Error(
      "No active outbound number in the pool. An admin must add one in Settings → Phone Numbers.",
    );
  if (existing) {
    if (
      chosen.id === existing.outbound_caller_id_id &&
      chosen.number === existing.outbound_caller_id_number
    )
      return { assignment: existing, created: false };

    // Retirement takes precedence over the daily lock. Completed attempts keep
    // their original caller-ID snapshots so callbacks and history still work.
    const previousNumber = existing.outbound_caller_id_number;
    const { error } = await db
      .from("daily_phone_assignments")
      .update({
        outbound_caller_id_id: chosen.id,
        outbound_caller_id_number: chosen.number,
        selected_at: new Date().toISOString(),
        locked_at: null,
        first_call_attempt_id: null,
        override_reason: "Previous caller ID is no longer eligible for outbound calls",
      })
      .eq("id", existing.id)
      .eq("outbound_caller_id_number", previousNumber);
    if (error) throw new Error(error.message);
    const assignment = await loadAssignment(db, userId, workDate);
    const assignedNumber = numbers?.find(
      (number) =>
        number.id === assignment?.outbound_caller_id_id &&
        number.number === assignment?.outbound_caller_id_number,
    );
    if (!assignment || !assignedNumber || !chooseCallerId([assignedNumber], null))
      throw new Error("The outbound number changed. Please try again.");
    const { error: retentionError } = await db
      .from("phone_numbers")
      .update({ last_assigned_at: new Date().toISOString() })
      .eq("id", assignedNumber.id);
    if (retentionError) throw new Error(retentionError.message);
    const { audit } = await server();
    await audit(db, userId, "daily_assignment_replaced", null, {
      assignmentId: assignment.id,
      previousNumber,
      number: assignment.outbound_caller_id_number,
    });
    return { assignment, created: false };
  }
  const { error } = await db.from("daily_phone_assignments").insert({
    work_date: workDate,
    caller_user_id: userId,
    outbound_caller_id_id: chosen.id,
    outbound_caller_id_number: chosen.number,
    created_by: userId,
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  await db
    .from("phone_numbers")
    .update({ last_assigned_at: new Date().toISOString() })
    .eq("id", chosen.id);
  const assignment = await loadAssignment(db, userId, workDate);
  if (!assignment) throw new Error("Could not create today's phone assignment");
  return { assignment, created: !error };
}

export const ensureDailyAssignmentFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .handler(async ({ context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, audit } = await server();
    const db = await privilegedClient(context.supabase as never);
    const { assignment, created } = await resolveAssignment(db, context.userId);
    if (created)
      await audit(db, context.userId, "daily_assignment_created", null, {
        assignmentId: assignment.id,
        number: assignment.outbound_caller_id_number,
      });
    // The setter needs the real number: it is what a lawyer rings back on (and it stays live for
    // 30 days, so a call back next week still reaches their queue).
    void role;
    return {
      id: assignment.id,
      workDate: assignment.work_date,
      outboundCallerId: assignment.outbound_caller_id_number,
      lockedAt: assignment.locked_at,
    };
  });

// ----------------------------------------------------------------- calls ----

export type StartCallResult = {
  attemptId: string;
  toNumber: string;
  attemptNumber: number;
  callerIdMasked: string;
};

/** Validate everything and create the attempt row; the browser then dials with ProspectAttemptId. */
export const startProspectCallFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { firmId: string }) => z.object({ firmId: uuid }).parse(input))
  .handler(async ({ data, context }): Promise<StartCallResult> => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, loadSettings, audit } = await server();
    const { isEligibleToCall } = await import("./queues");
    const { missingComplianceFields } = await import("./settings");
    const { maskPhone } = await import("./normalise");
    const db = await privilegedClient(context.supabase as never);

    const settings = await loadSettings(db);
    const missing = missingComplianceFields(settings);
    if (missing.length > 0)
      throw new Error(
        `Complete the cold-calling details in Settings first: ${missing.join(", ")}.`,
      );

    const { data: firm } = await db
      .from("prospect_firms")
      .select("*")
      .eq("id", data.firmId)
      .maybeSingle();
    if (!firm) throw new Error("Prospect not found");
    const { isTestFirm } = await import("./queues");
    if (!role.isAdmin && isTestFirm(firm))
      throw new Error("Test firms can only be called by an admin");
    const { isFirmOpenNow } = await import("./calling-window");
    if (!isFirmOpenNow(firm.state))
      throw new Error("It is not 9:00 am yet in this firm's state — try them later.");
    const suppressed = firm.phone_e164
      ? (await db.rpc("is_phone_suppressed", { p: firm.phone_e164 })).data === true
      : false;
    const eligibility = isEligibleToCall({ ...firm, suppressed });
    if (!eligibility.eligible) throw new Error(`Cannot call this firm: ${eligibility.reason}`);
    const { data: live } = await db
      .from("prospect_call_attempts")
      .select("id")
      .eq("caller_user_id", context.userId)
      .is("ended_at", null)
      .limit(1);
    if (live && live.length > 0)
      throw new Error("You already have a live call. Finish it and save the outcome first.");

    const { assignment } = await resolveAssignment(db, context.userId);
    const { data: attempt, error } = await db
      .from("prospect_call_attempts")
      .insert({
        prospect_firm_id: firm.id,
        prospect_contact_id: firm.primary_contact_id,
        caller_user_id: context.userId,
        caller_rep_id: role.repId,
        daily_phone_assignment_id: assignment.id,
        outbound_caller_id_id: assignment.outbound_caller_id_id,
        outbound_caller_id_number: assignment.outbound_caller_id_number,
        to_number: firm.phone_e164!,
        attempt_number: firm.call_attempt_count + 1,
        telephony_status: "initiated",
      })
      .select("id")
      .single();
    if (error)
      throw new Error(
        /duplicate|unique/i.test(error.message)
          ? "You already have a live call. Finish it and save the outcome first."
          : error.message,
      );

    if (!assignment.locked_at)
      await db
        .from("daily_phone_assignments")
        .update({ locked_at: new Date().toISOString(), first_call_attempt_id: attempt.id })
        .eq("id", assignment.id)
        .is("locked_at", null);
    // Claim the firm for this caller so two setters don't work the same lead.
    if (!firm.assigned_caller_user_id)
      await db
        .from("prospect_firms")
        .update({ assigned_caller_user_id: context.userId })
        .eq("id", firm.id);
    await audit(db, context.userId, "call_started", firm.id, {
      attemptId: attempt.id,
      callerId: assignment.outbound_caller_id_number,
    });
    return {
      attemptId: attempt.id,
      toNumber: firm.phone_e164!,
      attemptNumber: firm.call_attempt_count + 1,
      callerIdMasked: maskPhone(assignment.outbound_caller_id_number),
    };
  });

/** The browser reports the SDK's view of the call ending. */
export const endProspectCallFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator(
    (input: {
      attemptId: string;
      telephonyStatus?: string;
      durationSeconds?: number;
      callSid?: string | null;
    }) =>
      z
        .object({
          attemptId: uuid,
          telephonyStatus: z.string().max(30).optional(),
          durationSeconds: z.number().int().min(0).optional(),
          callSid: z.string().max(64).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context as Ctx);
    const { privilegedClient } = await server();
    const { TELEPHONY_STATUS_RANK } = await import("./types");
    const db = await privilegedClient(context.supabase as never);
    const { data: attempt } = await db
      .from("prospect_call_attempts")
      .select(
        "id, caller_user_id, ended_at, telephony_status, connected_at, duration_seconds, twilio_call_sid",
      )
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.caller_user_id !== context.userId) throw new Error("Not your call");
    const patch: Record<string, unknown> = {};
    if (!attempt.ended_at) patch["ended_at"] = new Date().toISOString();
    if (data.callSid && !attempt.twilio_call_sid) patch["twilio_call_sid"] = data.callSid;
    if (
      data.telephonyStatus &&
      (TELEPHONY_STATUS_RANK[data.telephonyStatus] ?? -1) >=
        (TELEPHONY_STATUS_RANK[attempt.telephony_status] ?? -1) &&
      attempt.telephony_status !== data.telephonyStatus
    )
      patch["telephony_status"] = data.telephonyStatus;
    if (data.durationSeconds !== undefined && attempt.duration_seconds === null)
      patch["duration_seconds"] = data.durationSeconds;
    if (data.durationSeconds && !attempt.connected_at)
      patch["connected_at"] = new Date(Date.now() - data.durationSeconds * 1000).toISOString();
    if (Object.keys(patch).length > 0)
      await db
        .from("prospect_call_attempts")
        .update(patch as never)
        .eq("id", attempt.id);
    return { ok: true };
  });

const dispositionCodes = DISPOSITIONS.map((d) => d.code) as [Disposition, ...Disposition[]];

/** Save the outcome + notes for an attempt and apply the pipeline automation. */
export const saveDispositionFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator(
    (input: { attemptId?: string | null; firmId?: string | null } & DispositionInput) =>
      z
        .object({
          attemptId: uuid.nullable().optional(),
          firmId: uuid.nullable().optional(),
          disposition: z.enum(dispositionCodes),
          notes: z.string().max(4000).default(""),
          followUpAt: z.string().max(40).nullable().optional(),
          assignedOwnerUserId: uuid.nullable().optional(),
          meetingAt: z.string().max(40).nullable().optional(),
          meetingReference: z.string().max(500).nullable().optional(),
          reason: z.string().max(500).nullable().optional(),
          recipientAskedNotToBeCalled: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, loadSettings, audit } = await server();
    const { planDisposition } = await import("./dispositions");
    const { phoneTail } = await import("./normalise");
    const db = await privilegedClient(context.supabase as never);

    let attempt = data.attemptId
      ? (await db.from("prospect_call_attempts").select("*").eq("id", data.attemptId).maybeSingle())
          .data
      : null;
    if (!attempt && data.firmId) {
      // No live call on screen (page refreshed, or booked after a call from another phone):
      // reuse the caller's most recent unsaved call on this firm, else record a manual outcome.
      const since = new Date(Date.now() - 2 * 3600000).toISOString();
      const { data: recent } = await db
        .from("prospect_call_attempts")
        .select("*")
        .eq("prospect_firm_id", data.firmId)
        .eq("caller_user_id", context.userId)
        .is("business_disposition", null)
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      attempt = recent ?? null;
      if (!attempt) {
        const { data: f } = await db
          .from("prospect_firms")
          .select("id, phone_e164, call_attempt_count, primary_contact_id")
          .eq("id", data.firmId)
          .maybeSingle();
        if (!f) throw new Error("Prospect not found");
        if (!f.phone_e164) throw new Error("This firm has no phone number on file");
        const { data: created, error } = await db
          .from("prospect_call_attempts")
          .insert({
            prospect_firm_id: f.id,
            prospect_contact_id: f.primary_contact_id,
            caller_user_id: context.userId,
            caller_rep_id: role.repId,
            outbound_caller_id_number: "manual",
            to_number: f.phone_e164,
            attempt_number: f.call_attempt_count + 1,
            telephony_status: "manual",
            ended_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        attempt = created;
      }
    }
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.caller_user_id !== context.userId && !role.isAdmin)
      throw new Error("Not your call");
    if (attempt.business_disposition)
      throw new Error("An outcome has already been saved for this call");
    const { data: firm } = await db
      .from("prospect_firms")
      .select("*")
      .eq("id", attempt.prospect_firm_id)
      .single();
    if (!firm) throw new Error("Prospect not found");

    const settings = await loadSettings(db);
    const now = new Date();
    const { attemptId: _ignored, firmId: _ignoredFirm, ...input } = data;
    const outcome = planDisposition(firm, input as DispositionInput, context.userId, now, settings, {
      neverRang: attempt.telephony_status === "failed",
    });
    if (!outcome.ok) throw new Error(outcome.error);
    const { plan } = outcome;

    const attemptPatch: Record<string, unknown> = { ...plan.attemptPatch };
    if (!attempt.ended_at) attemptPatch["ended_at"] = now.toISOString();
    if (attempt.telephony_status === "initiated" || attempt.telephony_status === "ringing") {
      attemptPatch["telephony_status"] =
        plan.reachedDecisionMaker || data.disposition === "gatekeeper_try_again"
          ? "completed"
          : "no-answer";
    }
    const { error: attemptError } = await db
      .from("prospect_call_attempts")
      .update(attemptPatch as never)
      .eq("id", attempt.id);
    if (attemptError) throw new Error(attemptError.message);
    const { error: firmError } = await db
      .from("prospect_firms")
      .update(plan.firmPatch as never)
      .eq("id", firm.id);
    if (firmError) throw new Error(firmError.message);
    if (plan.suppress && firm.phone_e164) {
      await db.from("phone_suppressions").upsert(
        {
          phone_e164: firm.phone_e164,
          phone_tail: phoneTail(firm.phone_e164),
          prospect_firm_id: firm.id,
          reason: plan.suppress.reason,
          source: "caller_disposition",
          created_by: context.userId,
        },
        { onConflict: "phone_e164", ignoreDuplicates: true },
      );
    }
    await audit(db, context.userId, `disposition_${plan.auditAction}`, firm.id, {
      attemptId: attempt.id,
      disposition: data.disposition,
      followUpAt: plan.attemptPatch.follow_up_at,
      exhausted: plan.exhausted,
    });
    return {
      ok: true,
      attemptId: attempt.id,
      prospectStatus: plan.firmPatch.prospect_status,
      followUpAt: plan.attemptPatch.follow_up_at,
      exhausted: plan.exhausted,
      bookingUrl: (await import("./settings")).DEFAULT_BOOKING_URL,
    };
  });

// ----------------------------------------------------------------- admin ----

export const saveColdCallingSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { settingsSchema, validateWindows, COLD_CALLING_SETTINGS_KEY } =
      await import("./settings");
    const parsed = settingsSchema.safeParse(data);
    if (!parsed.success)
      throw new Error(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    const settings = parsed.data;
    const windowErrors = validateWindows(
      settings.calling_windows,
      settings.compliance_override?.enabled === true,
    );
    if (windowErrors.length > 0) throw new Error(windowErrors.join(" "));
    if (settings.compliance_override?.enabled) {
      if (!settings.compliance_override.reason.trim())
        throw new Error("A compliance override needs a written reason");
      settings.compliance_override = {
        ...settings.compliance_override,
        by: context.userId,
        at: new Date().toISOString(),
      };
    }
    const { privilegedClient, audit } = await server();
    const db = await privilegedClient(context.supabase as never);
    // An older open Settings form must not overwrite membership added by a new invite.
    const { data: current, error: readError } = await db.from("app_settings")
      .select("value").eq("key", COLD_CALLING_SETTINGS_KEY).maybeSingle();
    if (readError) throw new Error(readError.message);
    const membership = current?.value as { setter_user_ids?: string[]; setter_allowed_pages?: string[] } | null;
    settings.setter_user_ids = membership?.setter_user_ids ?? [];
    settings.setter_allowed_pages = membership?.setter_allowed_pages ?? [];
    const { error } = await db
      .from("app_settings")
      .upsert({ key: COLD_CALLING_SETTINGS_KEY, value: settings as never }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "settings_saved", null, {
      record_calls: settings.record_calls,
    });
    return { ok: true, settings };
  });

/** Pipeline actions: mark the deal, fix details, reopen, clear DNC. */
export const prospectActionFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator(
    (input: {
      firmId: string;
      action: "set_deal" | "update" | "clear_dnc" | "reopen" | "note" | "bump" | "reset";
      dealStatus?: "open" | "closed_won" | "closed_lost";
      note?: string;
      patch?: {
        state?: string | null;
        phone?: string | null;
        firm_name?: string;
        website?: string | null;
        primary_city?: string | null;
      };
    }) =>
      z
        .object({
          firmId: uuid,
          action: z.enum(["set_deal", "update", "clear_dnc", "reopen", "note", "bump", "reset"]),
          dealStatus: z.enum(["open", "closed_won", "closed_lost"]).optional(),
          note: z.string().max(2000).optional(),
          patch: z
            .object({
              state: z.string().max(40).nullable().optional(),
              phone: z.string().max(40).nullable().optional(),
              firm_name: z.string().trim().min(1).max(200).optional(),
              website: z.string().max(300).nullable().optional(),
              primary_city: z.string().max(100).nullable().optional(),
            })
            .optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    if (data.action !== "note" && !role.isAdmin) throw new Error("Admins only");
    const { privilegedClient, audit } = await server();
    const db = await privilegedClient(context.supabase as never);
    const now = new Date().toISOString();
    switch (data.action) {
      case "set_deal": {
        if (!data.dealStatus) throw new Error("dealStatus is required");
        const { error } = await db
          .from("prospect_firms")
          .update({
            deal_status: data.dealStatus,
            deal_closed_at: data.dealStatus === "open" ? null : now,
            deal_closed_by: data.dealStatus === "open" ? null : context.userId,
            deal_notes: data.note ?? null,
          })
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        break;
      }
      case "note": {
        const { data: firm } = await db
          .from("prospect_firms")
          .select("follow_up_note")
          .eq("id", data.firmId)
          .maybeSingle();
        if (!firm) throw new Error("Prospect not found");
        const stamp = new Date().toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
          dateStyle: "medium",
          timeStyle: "short",
        });
        const line = `[${stamp}] ${data.note ?? ""}`.trim();
        const { error } = await db
          .from("prospect_firms")
          .update({
            follow_up_note: firm.follow_up_note ? `${firm.follow_up_note}\n${line}` : line,
          })
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        break;
      }
      case "update": {
        const { normaliseAuPhone, normaliseDomain } = await import("./normalise");
        const { timezoneForState } = await import("./calling-window");
        const { normaliseState } = await import("@/legal/data/au-public-holidays");
        const patch: Record<string, unknown> = {};
        const p = data.patch ?? {};
        if (p.firm_name !== undefined) patch["firm_name"] = p.firm_name;
        if (p.website !== undefined) {
          patch["website"] = p.website;
          const domain = normaliseDomain(p.website);
          if (domain) patch["root_domain"] = domain;
        }
        if (p.primary_city !== undefined) patch["primary_city"] = p.primary_city;
        if (p.state !== undefined) {
          const code = normaliseState(p.state);
          if (p.state && !code) throw new Error("Unknown state");
          patch["state"] = code;
          patch["timezone"] = timezoneForState(code);
        }
        if (p.phone !== undefined) {
          if (p.phone) {
            const phone = normaliseAuPhone(p.phone);
            if (!phone) throw new Error("Enter a valid Australian number");
            patch["phone_e164"] = phone.e164;
            patch["phone_raw"] = p.phone;
            patch["phone_kind"] = phone.kind;
            patch["phone_verification_status"] = "admin_entered";
          } else patch["phone_e164"] = null;
        }
        const { error } = await db
          .from("prospect_firms")
          .update(patch as never)
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        break;
      }
      case "clear_dnc": {
        const { data: firm } = await db
          .from("prospect_firms")
          .select("phone_e164")
          .eq("id", data.firmId)
          .single();
        if (!firm) throw new Error("Prospect not found");
        const { error } = await db
          .from("prospect_firms")
          .update({
            do_not_contact: false,
            do_not_contact_at: null,
            do_not_contact_reason: null,
            do_not_contact_by: null,
            prospect_status: "new",
          })
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        if (firm.phone_e164)
          await db.from("phone_suppressions").delete().eq("phone_e164", firm.phone_e164);
        break;
      }
      case "bump": {
        // Front of the queue: a due follow-up outranks everything else in the ordering.
        const { error } = await db
          .from("prospect_firms")
          .update({ next_follow_up_at: now, assigned_caller_user_id: null })
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        break;
      }
      case "reset": {
        // Admin only: back to a never-called state (used for test firms). Deletes this firm's call history.
        await db.from("prospect_call_attempts").delete().eq("prospect_firm_id", data.firmId);
        await db.from("phone_suppressions").delete().eq("prospect_firm_id", data.firmId);
        const { error } = await db
          .from("prospect_firms")
          .update({
            prospect_status: "new",
            call_attempt_count: 0,
            unsuccessful_attempt_count: 0,
            last_call_at: null,
            last_disposition: null,
            next_follow_up_at: null,
            follow_up_note: null,
            follow_up_owner_user_id: null,
            assigned_caller_user_id: null,
            do_not_contact: false,
            do_not_contact_at: null,
            do_not_contact_reason: null,
            do_not_contact_by: null,
            meeting_at: null,
            meeting_reference: null,
            meeting_booked_at: null,
            meeting_booked_by: null,
            deal_status: "open",
            deal_closed_at: null,
            deal_closed_by: null,
            deal_notes: null,
            bad_fit_reason: null,
          })
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        break;
      }
      case "reopen": {
        const { error } = await db
          .from("prospect_firms")
          .update({
            prospect_status: "new",
            unsuccessful_attempt_count: 0,
            next_follow_up_at: null,
            bad_fit_reason: null,
            assigned_caller_user_id: null,
          })
          .eq("id", data.firmId);
        if (error) throw new Error(error.message);
        break;
      }
      default:
        break;
    }
    await audit(db, context.userId, `admin_${data.action}`, data.firmId, {
      ...data,
      firmId: undefined,
    });
    return { ok: true };
  });

// -------------------------------------------------------------- handover ----

/** Draft of the handover email for a booked meeting, for the setter to review. */
export const getHandoverDraftFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { attemptId: string }) => z.object({ attemptId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context as Ctx);
    const { buildHandoverForAttempt } = await server();
    const draft = await buildHandoverForAttempt(data.attemptId);
    if (!draft) throw new Error("This call is not marked as a booked meeting");
    return draft;
  });

/** Setter adds anything extra, then the handover goes to Peter. */
export const sendHandoverFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { attemptId: string; extraNotes: string }) =>
    z.object({ attemptId: uuid, extraNotes: z.string().max(4000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, sendMeetingHandover } = await server();
    const db = await privilegedClient(context.supabase as never);
    const { data: attempt } = await db
      .from("prospect_call_attempts")
      .select("id, caller_user_id, notes")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.caller_user_id !== context.userId && !role.isAdmin)
      throw new Error("Not your call");
    const extra = data.extraNotes.trim();
    if (extra) {
      const notes = attempt.notes
        ? `${attempt.notes}\n\nAdded before handover: ${extra}`
        : `Added before handover: ${extra}`;
      await db.from("prospect_call_attempts").update({ notes }).eq("id", attempt.id);
    }
    const { buildHandoverForAttempt } = await server();
    const draft = await buildHandoverForAttempt(attempt.id);
    if (!draft) throw new Error("This call is not marked as a booked meeting");
    if (!draft.debriefReady && !draft.isManual)
      throw new Error("The call summary is not ready yet — the handover is sent once it is.");
    const result = await sendMeetingHandover(attempt.id, {
      allowWithoutTranscript: draft.isManual,
    });
    if (result === "failed")
      throw new Error("The email could not be sent. It will be retried automatically.");
    return { result };
  });

/** The caller's most recent booked-meeting call whose handover has not been sent (last 12 hours). */
export const getPendingHandoverFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .handler(async ({ context }) => {
    await requireStaff(context as Ctx);
    const { privilegedClient, buildHandoverForAttempt } = await server();
    const db = await privilegedClient(context.supabase as never);
    const since = new Date(Date.now() - 12 * 3600000).toISOString();
    const { data: attempts } = await db
      .from("prospect_call_attempts")
      .select("id, prospect_firm_id")
      .eq("caller_user_id", context.userId)
      .eq("business_disposition", "meeting_booked")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(5);
    for (const a of attempts ?? []) {
      const draft = await buildHandoverForAttempt(a.id);
      if (draft && !draft.alreadySent) return { attemptId: a.id, firmId: a.prospect_firm_id };
    }
    return null;
  });

/** Store Twilio's CallSid as soon as the browser knows it, so the recording is found without any webhook. */
export const linkCallSidFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { attemptId: string; callSid: string }) =>
    z.object({ attemptId: uuid, callSid: z.string().min(10).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context as Ctx);
    const { privilegedClient } = await server();
    const db = await privilegedClient(context.supabase as never);
    await db
      .from("prospect_call_attempts")
      .update({ twilio_call_sid: data.callSid })
      .eq("id", data.attemptId)
      .eq("caller_user_id", context.userId)
      .is("twilio_call_sid", null);
    return { ok: true };
  });

/** Transcribe the recording behind a booked-meeting call, inline, on this deployment. */
export const transcribeAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { attemptId: string }) => z.object({ attemptId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context as Ctx);
    const { privilegedClient, processProspectRecording } = await server();
    const db = await privilegedClient(context.supabase as never);
    const { data: attempt } = await db
      .from("prospect_call_attempts")
      .select("call_record_id")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt?.call_record_id) return { transcribed: false };
    const result = await processProspectRecording(attempt.call_record_id);
    return { transcribed: result.transcribed };
  });

/** Generate the AI debrief for a booked-meeting call whose transcript is ready. */
export const debriefAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { attemptId: string }) => z.object({ attemptId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context as Ctx);
    const { debriefForAttempt } = await server();
    const debrief = await debriefForAttempt(data.attemptId);
    return { ready: !!debrief };
  });

/** Pre-filled "last resort" email for the firm on screen. */
export const getColdEmailDraftFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { firmId: string }) => z.object({ firmId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, loadSettings } = await server();
    const { buildColdEmail } = await import("./email-template");
    const db = await privilegedClient(context.supabase as never);
    const [{ data: firm }, { data: contact }, { data: rep }, settings] = await Promise.all([
      db
        .from("prospect_firms")
        .select("firm_name, state, primary_contact_id")
        .eq("id", data.firmId)
        .maybeSingle(),
      db
        .from("prospect_contacts")
        .select("full_name")
        .eq("prospect_firm_id", data.firmId)
        .eq("is_primary_decision_maker", true)
        .limit(1)
        .maybeSingle(),
      db.from("sales_reps").select("name").eq("user_id", context.userId).maybeSingle(),
      loadSettings(db),
    ]);
    if (!firm) throw new Error("Prospect not found");
    const senderName = rep?.name?.trim() || "The Bold team";
    const senderFirstName = senderName.split(" ")[0] ?? senderName;
    return buildColdEmail({
      firmName: firm.firm_name,
      state: firm.state,
      contactFirstName: contact?.full_name?.split(" ")[0] ?? null,
      setterFirstName: senderFirstName,
      sender: { fullName: senderName, isCloser: role.isAdmin },
      businessName: settings.business_name,
      callbackNumber: settings.callback_number,
    });
  });

/**
 * Send the cold email, mark the firm as Emailed with a follow-up in 3 business
 * days, and close the current call (if any) as "Follow up — asked for an email".
 */
export const sendColdEmailFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator(
    (input: {
      firmId: string;
      to: string;
      subject: string;
      body: string;
      attemptId: string | null;
      callBackAt?: string | null;
    }) =>
      z
        .object({
          firmId: uuid,
          to: z.string().trim().email(),
          subject: z.string().trim().min(1).max(200),
          body: z.string().trim().min(1).max(8000),
          attemptId: uuid.nullable(),
          callBackAt: z.string().datetime({ offset: true }).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, audit } = await server();
    const { addBusinessDays, zonedInstant, timezoneForState } = await import("./calling-window");
    const { sendEmail, HANDOVER_FROM } = await import("@/legal/lib/email.server");
    const db = await privilegedClient(context.supabase as never);
    const { data: firm } = await db
      .from("prospect_firms")
      .select("id, firm_name, state, do_not_contact, follow_up_note")
      .eq("id", data.firmId)
      .maybeSingle();
    if (!firm) throw new Error("Prospect not found");
    if (firm.do_not_contact) throw new Error("This firm is marked Do Not Contact");
    const { isTestFirm } = await import("./queues");
    if (!role.isAdmin && isTestFirm(firm))
      throw new Error("Test firms can only be emailed by an admin");

    // The email goes out in the name of whoever is logged in (the cold caller), on the domain
    // verified with Resend (DKIM signed): "Sol Bowen <sol@bold-marketing.com.au>". Replies go to
    // Peter, who closes.
    const { senderMailboxFor } = await import("./email-template");
    const { data: rep } = await db
      .from("sales_reps")
      .select("name")
      .eq("user_id", context.userId)
      .maybeSingle();
    const senderName = rep?.name?.trim() || "The Bold team";
    const senderDomain = legalEnv["COLD_CALL_FROM_DOMAIN"] ?? "bold-marketing.com.au";
    const replyTo = legalEnv["COLD_CALL_REPLY_TO"] ?? "peter@gobold.com.au";
    const preferredFrom = `${senderName} <${senderMailboxFor(senderName)}@${senderDomain}>`;
    const fallbackFrom = `${senderName} <${HANDOVER_FROM.replace(/^.*<|>.*$/g, "")}>`;
    // Plain text only (reads as a personal email, which is what lands in Primary). If the sender
    // domain is ever not verified with Resend, fall back to the verified handover sender.
    let sent = await sendEmail({
      to: [data.to],
      subject: data.subject,
      text: data.body,
      from: preferredFrom,
      replyTo,
    });
    let usedFrom = preferredFrom;
    if (!sent.ok) {
      sent = await sendEmail({
        to: [data.to],
        subject: data.subject,
        text: data.body,
        from: fallbackFrom,
        replyTo,
      });
      usedFrom = fallbackFrom;
    }
    if (!sent.ok) throw new Error(sent.error ?? "The email could not be sent");

    const now = new Date();
    const tz = timezoneForState(firm.state) ?? "Australia/Sydney";
    const todayISO = now.toLocaleDateString("en-CA", { timeZone: tz });
    // "I'll email you and call you back at 3" → a follow-up at 3, not an emailed lead due in 3 days.
    const promised = data.callBackAt ? new Date(data.callBackAt) : null;
    const followUpAt = promised
      ? promised.toISOString()
      : zonedInstant(addBusinessDays(todayISO, 3, firm.state), "10:00", tz).toISOString();
    const stamp = now.toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const line = `[${stamp}] Email sent to ${data.to}${promised ? ` — call back ${promisedLabel(promised)}` : ""}`;
    const { error } = await db
      .from("prospect_firms")
      .update({
        prospect_status: promised ? "follow_up" : "emailed",
        next_follow_up_at: followUpAt,
        follow_up_owner_user_id: context.userId,
        follow_up_note: firm.follow_up_note ? `${firm.follow_up_note}\n${line}` : line,
        assigned_caller_user_id: context.userId,
      })
      .eq("id", firm.id);
    if (error) throw new Error(error.message);

    if (data.attemptId) {
      const { data: attempt } = await db
        .from("prospect_call_attempts")
        .select("id, caller_user_id, business_disposition, notes, ended_at")
        .eq("id", data.attemptId)
        .maybeSingle();
      if (attempt && attempt.caller_user_id === context.userId && !attempt.business_disposition) {
        await db
          .from("prospect_call_attempts")
          .update({
            business_disposition: "follow_up",
            follow_up_at: followUpAt,
            notes: [
              attempt.notes,
              `Asked for an email — sent to ${data.to}${promised ? `; call back ${promisedLabel(promised)}` : ""}`,
            ]
              .filter(Boolean)
              .join("\n"),
            ended_at: attempt.ended_at ?? now.toISOString(),
          })
          .eq("id", attempt.id);
      }
    }
    await audit(db, context.userId, "cold_email_sent", firm.id, {
      to: data.to,
      subject: data.subject,
      from: usedFrom,
      body: data.body,
      attemptId: data.attemptId,
      callBackAt: data.callBackAt ?? null,
    });
    return { ok: true, from: usedFrom, followUpAt };
  });

/** "Thu 18 Sep, 3:00 pm" in Sydney time, for notes. */
function promisedLabel(at: Date): string {
  return at.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ------------------------------------------------------------------- cold text ----

async function coldMessageContext(db: Db, firmId: string, userId: string, isAdmin: boolean) {
  const { loadSettings } = await server();
  const [{ data: firm }, { data: contact }, { data: rep }, settings] = await Promise.all([
    db
      .from("prospect_firms")
      .select("firm_name, state, phone_e164, primary_contact_id")
      .eq("id", firmId)
      .maybeSingle(),
    db
      .from("prospect_contacts")
      .select("full_name")
      .eq("prospect_firm_id", firmId)
      .eq("is_primary_decision_maker", true)
      .limit(1)
      .maybeSingle(),
    db.from("sales_reps").select("name").eq("user_id", userId).maybeSingle(),
    loadSettings(db),
  ]);
  if (!firm) throw new Error("Prospect not found");
  const senderName = rep?.name?.trim() || "The Bold team";
  return {
    firm,
    input: {
      firmName: firm.firm_name,
      state: firm.state,
      contactFirstName: contact?.full_name?.split(" ")[0] ?? null,
      setterFirstName: senderName.split(" ")[0] ?? senderName,
      sender: { fullName: senderName, isCloser: isAdmin },
      businessName: settings.business_name,
      callbackNumber: settings.callback_number,
    },
  };
}

/** Pre-filled "last resort" text for the firm on screen. Pre-fills the number only when it is a mobile. */
export const getColdSmsDraftFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator((input: { firmId: string }) => z.object({ firmId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient } = await server();
    const { buildColdSms } = await import("./email-template");
    const db = await privilegedClient(context.supabase as never);
    const { firm, input } = await coldMessageContext(db, data.firmId, context.userId, role.isAdmin);
    const mobile = /^\+614\d{8}$/.test(firm.phone_e164 ?? "") ? firm.phone_e164 : null;
    return { to: mobile ?? "", body: buildColdSms(input) };
  });

/**
 * Send the cold text from the setter's own number for today (so a reply lands back in their
 * queue as a callback), mark the firm Texted with a follow-up in 3 business days, and close the
 * current call (if any) as "Follow up — asked for a text".
 */
export const sendColdSmsFn = createServerFn({ method: "POST" })
  .middleware([requireColdCallingAccess])
  .inputValidator(
    (input: {
      firmId: string;
      to: string;
      body: string;
      attemptId: string | null;
      callBackAt?: string | null;
    }) =>
      z
        .object({
          firmId: uuid,
          to: z.string().trim().min(8).max(20),
          body: z.string().trim().min(1).max(600),
          attemptId: uuid.nullable(),
          callBackAt: z.string().datetime({ offset: true }).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await requireStaff(context as Ctx);
    const { privilegedClient, audit } = await server();
    const { addBusinessDays, zonedInstant, timezoneForState } = await import("./calling-window");
    const { toAuE164, twilioForm, publicBaseUrl, recordOutboundSms } =
      await import("@/legal/lib/twilio.server");
    const db = await privilegedClient(context.supabase as never);
    const { data: firm } = await db
      .from("prospect_firms")
      .select("id, firm_name, state, do_not_contact, follow_up_note")
      .eq("id", data.firmId)
      .maybeSingle();
    if (!firm) throw new Error("Prospect not found");
    if (firm.do_not_contact) throw new Error("This firm is marked Do Not Contact");
    const { isTestFirm } = await import("./queues");
    if (!role.isAdmin && isTestFirm(firm))
      throw new Error("Test firms can only be texted by an admin");

    const to = toAuE164(data.to);
    if (!to) throw new Error("That doesn't look like an Australian number");
    if (!/^\+614/.test(to))
      throw new Error("Texts can only go to a mobile (04…) — ask for their mobile");

    const { assignment } = await resolveAssignment(db, context.userId);
    const from = assignment.outbound_caller_id_number;
    // Twilio refuses a text whose To and From match; explain it before it gets that far.
    if (to === from) {
      const { formatAuNumber } = await import("./callbacks");
      throw new Error(
        `${formatAuNumber(to)} is your own calling number for today, so the text can't be sent to it. Enter the firm's mobile instead.`,
      );
    }
    const result = await twilioForm("/Messages.json", {
      To: to,
      From: from,
      Body: data.body,
      StatusCallback: `${publicBaseUrl()}/api/public/hooks/twilio-sms-status`,
    });
    if (!result.ok)
      throw new Error(String(result.json["message"] ?? "Twilio could not send the text"));
    const sid = String(result.json["sid"] ?? "");
    await recordOutboundSms(null, to, data.body, sid);

    const now = new Date();
    const tz = timezoneForState(firm.state) ?? "Australia/Sydney";
    const todayISO = now.toLocaleDateString("en-CA", { timeZone: tz });
    const promised = data.callBackAt ? new Date(data.callBackAt) : null;
    const followUpAt = promised
      ? promised.toISOString()
      : zonedInstant(addBusinessDays(todayISO, 3, firm.state), "10:00", tz).toISOString();
    const stamp = now.toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const { formatAuNumber } = await import("./callbacks");
    const line = `[${stamp}] Text sent to ${formatAuNumber(to)}${promised ? ` — call back ${promisedLabel(promised)}` : ""}`;
    const { error } = await db
      .from("prospect_firms")
      .update({
        prospect_status: promised ? "follow_up" : "texted",
        next_follow_up_at: followUpAt,
        follow_up_owner_user_id: context.userId,
        follow_up_note: firm.follow_up_note ? `${firm.follow_up_note}\n${line}` : line,
        assigned_caller_user_id: context.userId,
      })
      .eq("id", firm.id);
    if (error) throw new Error(error.message);

    if (data.attemptId) {
      const { data: attempt } = await db
        .from("prospect_call_attempts")
        .select("id, caller_user_id, business_disposition, notes, ended_at")
        .eq("id", data.attemptId)
        .maybeSingle();
      if (attempt && attempt.caller_user_id === context.userId && !attempt.business_disposition) {
        await db
          .from("prospect_call_attempts")
          .update({
            business_disposition: "follow_up",
            follow_up_at: followUpAt,
            notes: [
              attempt.notes,
              `Asked for a text — sent to ${formatAuNumber(to)}${promised ? `; call back ${promisedLabel(promised)}` : ""}`,
            ]
              .filter(Boolean)
              .join("\n"),
            ended_at: attempt.ended_at ?? now.toISOString(),
          })
          .eq("id", attempt.id);
      }
    }
    await audit(db, context.userId, "cold_sms_sent", firm.id, {
      to,
      from,
      body: data.body,
      sid,
      attemptId: data.attemptId,
      callBackAt: data.callBackAt ?? null,
    });
    return { ok: true, from, followUpAt };
  });

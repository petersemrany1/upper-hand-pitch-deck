import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "./logic";

/**
 * Disposition writes with UNDO.
 *
 * Product rule: a good lead must never be lost to a fat-finger. Every
 * disposition (status change / callback scheduling) snapshots the lead's
 * previous status + callback time and offers a one-click Undo on the
 * confirmation toast that restores both — in the DB and in local state.
 */

export type LeadPatchFn = (id: string, patch: Partial<Lead>) => void;

export type DispositionSnapshot = {
  leadId: string;
  leadName: string;
  prevStatus: string | null;
  prevCallbackAt: string | null;
};

export function snapshotLead(lead: Lead): DispositionSnapshot {
  return {
    leadId: lead.id,
    leadName: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "lead",
    prevStatus: lead.status ?? null,
    prevCallbackAt: lead.callback_scheduled_at ?? null,
  };
}

let lastSnapshot: DispositionSnapshot | null = null;

/** The most recent disposition, if any — used by the keyboard shortcut. */
export function getLastDisposition(): DispositionSnapshot | null {
  return lastSnapshot;
}

/**
 * Restore a lead to its pre-disposition status + callback time.
 * Returns true on success.
 */
export async function undoDisposition(
  snapshot: DispositionSnapshot,
  onLocalLeadUpdate?: LeadPatchFn
): Promise<boolean> {
  const { error } = await supabase
    .from("meta_leads")
    .update({
      // status column is NOT NULL; "new" matches normaliseStatus's fallback
      status: snapshot.prevStatus ?? "new",
      callback_scheduled_at: snapshot.prevCallbackAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", snapshot.leadId);
  if (error) {
    toast.error(`Undo failed — ${error.message}`);
    return false;
  }
  onLocalLeadUpdate?.(snapshot.leadId, {
    status: snapshot.prevStatus,
    callback_scheduled_at: snapshot.prevCallbackAt,
  });
  if (lastSnapshot?.leadId === snapshot.leadId) lastSnapshot = null;
  toast.success(`Undone — ${snapshot.leadName} restored`);
  return true;
}

/**
 * Show the standard "disposition applied" toast with an Undo action.
 * Call AFTER the write succeeded, passing the snapshot taken BEFORE it.
 */
export function announceDisposition(
  snapshot: DispositionSnapshot,
  label: string,
  onLocalLeadUpdate?: LeadPatchFn
): void {
  lastSnapshot = snapshot;
  toast.success(label, {
    duration: 8000,
    action: {
      label: "Undo",
      onClick: () => void undoDisposition(snapshot, onLocalLeadUpdate),
    },
  });
}

/**
 * Apply a status disposition (optimistic + undoable). Shared by click
 * handlers and the single-key shortcuts.
 */
export async function applyStatusDisposition(args: {
  lead: Lead;
  statusKey: string;
  statusLabel: string;
  onLocalLeadUpdate?: LeadPatchFn;
}): Promise<boolean> {
  const { lead, statusKey, statusLabel, onLocalLeadUpdate } = args;
  const snapshot = snapshotLead(lead);
  const clearsCallback = statusKey !== "callback_scheduled";
  onLocalLeadUpdate?.(lead.id, {
    status: statusKey,
    ...(clearsCallback ? { callback_scheduled_at: null } : {}),
  });
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("meta_leads")
    .update(
      clearsCallback
        ? { status: statusKey, callback_scheduled_at: null, updated_at: nowIso }
        : { status: statusKey, updated_at: nowIso }
    )
    .eq("id", lead.id);
  if (error) {
    onLocalLeadUpdate?.(lead.id, {
      status: snapshot.prevStatus,
      callback_scheduled_at: snapshot.prevCallbackAt,
    });
    toast.error("Couldn't update status");
    return false;
  }
  announceDisposition(snapshot, statusLabel, onLocalLeadUpdate);
  return true;
}

// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmContractPanel.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { formatCents } from "@/legal/lib/contracts/pricing";
import {
  chargeBlock2CardFn,
  listFirmContractsFn,
  markContractPaidFn,
  requestBlock2Fn,
  resendContractEmailFn,
  resendPaymentEmailFn,
  signedContractUrlFn,
  voidContractFn,
} from "@/legal/lib/firm-contracts.functions";
import { SendContractWizard, type WizardFirm } from "./SendContractWizard";

type Contract = Awaited<ReturnType<typeof listFirmContractsFn>>[number];

const REMINDER_DAYS = [1, 2, 3, 5, 9, 11, 14, 15];

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "grey" | "blue" | "green" | "amber" | "red";
}) {
  const cls = {
    grey: "bg-muted text-muted-foreground",
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    red: "bg-red-500/10 text-red-700",
  }[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>
  );
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FirmContractPanel({ firm }: { firm: WizardFirm }) {
  const qc = useQueryClient();
  const [wizard, setWizard] = useState(false);
  const contracts = useQuery({
    queryKey: ["firm-contracts", firm.id],
    queryFn: () => listFirmContractsFn({ data: { firmId: firm.id } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["firm-contracts", firm.id] });

  const act = useMutation({
    mutationFn: async (job: () => Promise<unknown>) => job(),
    onSuccess: () => {
      toast.success("Done");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const run = (job: () => Promise<unknown>) => act.mutate(job);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contract</h3>
        <Button type="button" size="sm" onClick={() => setWizard(true)}>
          Send contract
        </Button>
      </div>

      {contracts.isLoading ? (
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      ) : (contracts.data ?? []).length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No contract sent yet.</p>
      ) : (
        <div className="space-y-2">
          {(contracts.data ?? []).map((c: Contract) => {
            const signed = c.contract_status === "signed";
            const dead = c.contract_status === "voided" || c.contract_status === "declined";
            const b2Open = Boolean(c.b2_requested_at) && c.b2_payment_status === "unpaid";
            const hasCard = Boolean(c.stripe_customer_id && c.stripe_payment_method_id);
            return (
              <div
                key={c.id}
                className={`rounded-lg border p-3 text-[13px] ${dead ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{c.pack_name}</span>
                  <span className="text-muted-foreground">
                    · {c.shows} shows · {formatCents(c.total_inc_cents)} inc. GST
                    {c.is_split ? " · split" : ""}
                  </span>
                  <span className="ml-auto flex gap-1">
                    <Chip
                      label={
                        c.contract_status === "sent"
                          ? "Sent"
                          : c.contract_status === "viewed"
                            ? "Viewed"
                            : signed
                              ? "Signed"
                              : c.contract_status === "declined"
                                ? "Declined"
                                : "Voided"
                      }
                      tone={
                        signed
                          ? "green"
                          : dead
                            ? "red"
                            : c.contract_status === "viewed"
                              ? "blue"
                              : "grey"
                      }
                    />
                    <Chip
                      label={
                        c.payment_status === "paid"
                          ? c.is_split
                            ? "Block 1 paid"
                            : "Paid"
                          : "Unpaid"
                      }
                      tone={c.payment_status === "paid" ? "green" : "amber"}
                    />
                    {c.is_split && c.b2_requested_at ? (
                      <Chip
                        label={c.b2_payment_status === "paid" ? "Block 2 paid" : "Block 2 due"}
                        tone={c.b2_payment_status === "paid" ? "green" : "amber"}
                      />
                    ) : null}
                  </span>
                </div>

                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {c.flagged_for_call ? (
                    <span className="font-semibold text-red-700">
                      Needs a call — all {REMINDER_DAYS.length} reminders sent.
                    </span>
                  ) : c.next_reminder_at ? (
                    <>
                      Reminder {c.reminder_stage} of {REMINDER_DAYS.length} sent — next{" "}
                      {fmtWhen(c.next_reminder_at)}
                    </>
                  ) : dead ? (
                    "No reminders."
                  ) : (
                    "Signed and paid — reminders stopped."
                  )}
                  {hasCard ? " · Card on file" : ""}
                </p>

                {!dead ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!signed && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(() => resendContractEmailFn({ data: { contractId: c.id } }))
                        }
                      >
                        Resend contract
                      </Button>
                    )}
                    {(c.payment_status !== "paid" || b2Open) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(() => resendPaymentEmailFn({ data: { contractId: c.id } }))
                        }
                      >
                        Resend payment link
                      </Button>
                    )}
                    {c.payment_status !== "paid" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const note = window.prompt("Reference (e.g. bank transfer ref)");
                          if (note !== null)
                            run(() =>
                              markContractPaidFn({ data: { contractId: c.id, block: "1", note } }),
                            );
                        }}
                      >
                        Mark {c.is_split ? "Block 1" : ""} paid
                      </Button>
                    )}
                    {c.is_split && !c.b2_requested_at && c.payment_status === "paid" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => run(() => requestBlock2Fn({ data: { contractId: c.id } }))}
                      >
                        Request Block 2 payment
                      </Button>
                    )}
                    {b2Open && hasCard && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const a = window.prompt(
                            "Paste the firm's written YES (date + wording) — required by clause 2.10",
                          );
                          if (a)
                            run(() =>
                              chargeBlock2CardFn({ data: { contractId: c.id, authorisation: a } }),
                            );
                        }}
                      >
                        Charge card on file
                      </Button>
                    )}
                    {b2Open && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const note = window.prompt("Reference");
                          if (note !== null)
                            run(() =>
                              markContractPaidFn({ data: { contractId: c.id, block: "2", note } }),
                            );
                        }}
                      >
                        Mark Block 2 paid
                      </Button>
                    )}
                    {c.signed_pdf_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(async () => {
                            const { url } = await signedContractUrlFn({
                              data: { contractId: c.id },
                            });
                            window.open(url, "_blank", "noopener");
                          })
                        }
                      >
                        Download signed PDF
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-700"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Void this contract? The Annature envelope is cancelled and unpaid links deactivated.",
                          )
                        )
                          run(() => voidContractFn({ data: { contractId: c.id } }));
                      }}
                    >
                      Void
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {wizard ? (
        <SendContractWizard
          firm={firm}
          onClose={() => setWizard(false)}
          onSent={() => void refresh()}
        />
      ) : null}
    </section>
  );
}

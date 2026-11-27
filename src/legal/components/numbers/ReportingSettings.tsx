// Ported from the Legal app (family-law-floater/src/components/numbers/ReportingSettings.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronRight, CircleDollarSign, Users, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getNumbersReport,
  syncLegalMetaSpend,
  saveReportingRate,
  saveReportingHours,
  saveManualSpend,
  deleteManualSpend,
} from "@/legal/lib/numbers.functions";
import { sydneyTodayISO } from "@/legal/lib/timezone";
import { money, oneDp } from "./format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/legal/components/ui/dialog";
export type NumbersReport = Awaited<ReturnType<typeof getNumbersReport>>;
export type SettingsPanel = "menu" | "outcomes" | "spend" | "rates" | null;
export function ReportingSettings({
  data,
  range,
  panel,
  setPanel,
  countMyPay,
  setCountMyPay,
  onSaved,
}: {
  data: NumbersReport;
  range: { from: string | null; to: string | null };
  panel: SettingsPanel;
  setPanel: (panel: SettingsPanel) => void;
  countMyPay: boolean;
  setCountMyPay: (value: boolean) => void;
  onSaved: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState({
    date: sydneyTodayISO(),
    ad_name: "",
    spend_aud: "",
    location: "",
  });
  const [rate, setRate] = useState({ rep_id: "", hourly_rate: "", booking_bonus: "" });
  const [hourEdit, setHourEdit] = useState<{
    rep_id: string;
    work_date: string;
    hours: string;
    note: string;
  } | null>(null);
  const saveHours = useServerFn(saveReportingHours);
  const sync = useServerFn(syncLegalMetaSpend),
    saveRate = useServerFn(saveReportingRate),
    saveSpend = useServerFn(saveManualSpend),
    removeSpend = useServerFn(deleteManualSpend);
  async function mutate(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      await onSaved();
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const title =
    panel === "outcomes"
      ? "Missing consultation outcomes"
      : panel === "spend"
        ? "Ad spend entries"
        : panel === "rates"
          ? "Team hours & pay"
          : "Manage reporting data";
  return (
    <Dialog
      open={!!panel}
      onOpenChange={(open) => {
        if (!open) setPanel(null);
      }}
    >
      <DialogContent className="numbers-settings legal-reporting">
        <DialogHeader>
          {panel !== "menu" && (
            <button className="numbers-button numbers-back" onClick={() => setPanel("menu")}>
              <ArrowLeft size={15} /> Back to data settings
            </button>
          )}
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {panel === "outcomes"
              ? "All locations · selected reporting period."
              : "Review the records behind your numbers."}
          </DialogDescription>
        </DialogHeader>
        {panel === "menu" && (
          <div className="numbers-settings-menu">
            {(
              [
                [
                  "outcomes",
                  ClipboardCheck,
                  "Consultation outcomes",
                  `${data.needsOutcome.length} consultations need a recorded result`,
                ],
                [
                  "rates",
                  Users,
                  "Team hours & pay",
                  "Review rates, booking bonuses and daily hours",
                ],
                [
                  "spend",
                  CircleDollarSign,
                  "Ad spend entries",
                  "Review imports and add manual costs",
                ],
              ] as const
            ).map(([key, Icon, label, description]) => (
              <button key={key} onClick={() => setPanel(key)}>
                <Icon size={20} />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
            <label className="numbers-pay-option">
              <input
                type="checkbox"
                checked={countMyPay}
                onChange={(e) => setCountMyPay(e.target.checked)}
              />{" "}
              Include Peter’s pay in Overview costs
            </label>
          </div>
        )}
        {panel === "outcomes" && (
          <section className="numbers-card">
            <h2>Consultations awaiting an outcome</h2>
            <p>
              Record the actual result in the firm portal. Missing outcomes remain separate from
              confirmed attendance.
            </p>
            <div className="legal-table-scroll">
              <table className="legal-report-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Firm</th>
                    <th>Consultation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.needsOutcome.map((a) => (
                    <tr key={a.appointment_id}>
                      <td>{a.client_name}</td>
                      <td>{a.firm_name}</td>
                      <td>
                        {a.appointment_date} · {a.appointment_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.needsOutcome.length && <p>No past consultations awaiting an outcome.</p>}
            </div>
          </section>
        )}
        {panel === "spend" && (
          <section className="numbers-card">
            <div className="numbers-panel-heading">
              <h2>Spend ledger</h2>
              {data.manualSyncAvailable && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void mutate(() =>
                      sync({
                        data: {
                          from: range.from ?? data.reportingRange.from,
                          to: range.to ?? sydneyTodayISO(),
                        },
                      }),
                    )
                  }
                >
                  {busy ? "Syncing…" : "Sync Meta spend"}
                </button>
              )}
            </div>
            <p>
              Meta spend refreshes automatically each morning. Today’s spend is provisional as the
              day is still in progress. Entries are reconciled by campaign, ad and day.
            </p>
            <form
              className="numbers-form"
              onSubmit={(e) => {
                e.preventDefault();
                void mutate(() =>
                  saveSpend({
                    data: {
                      ...manual,
                      spend_aud: Number(manual.spend_aud),
                      location: manual.location || null,
                    },
                  }),
                );
              }}
            >
              <label>
                Date
                <input
                  required
                  type="date"
                  value={manual.date}
                  onChange={(e) => setManual({ ...manual, date: e.target.value })}
                />
              </label>
              <label>
                Ad / description
                <input
                  required
                  value={manual.ad_name}
                  onChange={(e) => setManual({ ...manual, ad_name: e.target.value })}
                />
              </label>
              <label>
                Spend AUD
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={manual.spend_aud}
                  onChange={(e) => setManual({ ...manual, spend_aud: e.target.value })}
                />
              </label>
              <label>
                City
                <input
                  value={manual.location}
                  onChange={(e) => setManual({ ...manual, location: e.target.value })}
                />
              </label>
              <button disabled={busy} type="submit">
                Add manual spend
              </button>
            </form>
            <div className="legal-table-scroll">
              <table className="legal-report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ad</th>
                    <th>City</th>
                    <th>Spend</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.spendRows.map((s) => (
                    <tr key={s.id}>
                      <td>{s.date}</td>
                      <td>{s.ad_name}</td>
                      <td>{s.location ?? "Unallocated"}</td>
                      <td>{money(s.spend_aud)}</td>
                      <td>{s.source}</td>
                      <td>
                        {s.source === "manual" && (
                          <button
                            disabled={busy}
                            onClick={() => {
                              if (window.confirm("Remove this manual spend entry?"))
                                void mutate(() => removeSpend({ data: { id: s.id } }));
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {panel === "rates" && (
          <section className="numbers-card">
            <h2>Rep pay rates</h2>
            <p>
              Leave a rate blank if unknown. Enter 0 only for a confirmed zero rate. Changes apply
              to the full reporting history.
            </p>
            <details className="numbers-help">
              <summary>How hours are calculated</summary>
              <p>
                Call sessions split after a gap longer than 45 minutes, with at least five minutes
                per session. Time is allocated by talk time, or by leads contacted when talk time is
                zero. Login sessions are excluded. Daily corrections override calculated hours.
              </p>
            </details>
            <form
              className="numbers-form"
              onSubmit={(e) => {
                e.preventDefault();
                void mutate(() =>
                  saveRate({
                    data: {
                      rep_id: rate.rep_id,
                      hourly_rate: rate.hourly_rate === "" ? null : Number(rate.hourly_rate),
                      booking_bonus: rate.booking_bonus === "" ? null : Number(rate.booking_bonus),
                    },
                  }),
                );
              }}
            >
              <label>
                Rep
                <select
                  required
                  value={rate.rep_id}
                  onChange={(e) => {
                    const r = data.rates.find((r) => r.rep_id === e.target.value);
                    setRate({
                      rep_id: e.target.value,
                      hourly_rate: r?.hourly_rate == null ? "" : String(r.hourly_rate),
                      booking_bonus: r?.booking_bonus == null ? "" : String(r.booking_bonus),
                    });
                  }}
                >
                  <option value="">Choose a rep</option>
                  {data.reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hourly rate AUD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate.hourly_rate}
                  onChange={(e) => setRate({ ...rate, hourly_rate: e.target.value })}
                />
              </label>
              <label>
                Booking bonus AUD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate.booking_bonus}
                  onChange={(e) => setRate({ ...rate, booking_bonus: e.target.value })}
                />
              </label>
              <button disabled={busy || !rate.rep_id}>Save rates</button>
            </form>
            <div className="legal-table-scroll">
              <table className="legal-report-table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>Hourly rate</th>
                    <th>Booking bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reps.map((r) => {
                    const rate = data.rates.find((x) => x.rep_id === r.id);
                    return (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>
                          {rate?.hourly_rate == null ? "Not recorded" : money(rate.hourly_rate)}
                        </td>
                        <td>
                          {rate?.booking_bonus == null ? "Not recorded" : money(rate.booking_bonus)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h2 className="mt-6">Hours by day</h2>
            <p>
              Review calculated time before using it for payroll. These are reporting estimates.
            </p>
            {hourEdit && (
              <form
                className="numbers-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(async () => {
                    await saveHours({ data: { ...hourEdit, hours: Number(hourEdit.hours) } });
                    setHourEdit(null);
                  });
                }}
              >
                <span>{hourEdit.work_date}</span>
                <label>
                  Corrected hours
                  <input
                    required
                    type="number"
                    min="0"
                    max="24"
                    step="0.01"
                    value={hourEdit.hours}
                    onChange={(e) => setHourEdit({ ...hourEdit, hours: e.target.value })}
                  />
                </label>
                <label>
                  Reason
                  <input
                    required
                    maxLength={400}
                    value={hourEdit.note}
                    onChange={(e) => setHourEdit({ ...hourEdit, note: e.target.value })}
                  />
                </label>
                <button disabled={busy}>Save correction</button>
                <button type="button" onClick={() => setHourEdit(null)}>
                  Cancel
                </button>
              </form>
            )}
            <div className="legal-table-scroll">
              <table className="legal-report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Rep</th>
                    <th>Calls</th>
                    <th>Calculated hours</th>
                    <th>Hours used</th>
                    <th>Note</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.repDays.map((d) => (
                    <tr key={`${d.rep_id}:${d.work_date}`}>
                      <td>{d.work_date}</td>
                      <td>{d.rep_name}</td>
                      <td>{d.calls}</td>
                      <td>{oneDp(d.calculated_hours)}</td>
                      <td>
                        {oneDp(d.hours)}
                        {d.override_hours !== null ? " (corrected)" : ""}
                      </td>
                      <td>{d.note}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setHourEdit({
                              rep_id: d.rep_id,
                              work_date: d.work_date,
                              hours: String(d.hours),
                              note: d.note ?? "",
                            })
                          }
                        >
                          Correct hours
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

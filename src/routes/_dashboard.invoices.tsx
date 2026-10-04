import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  listRepInvoices,
  submitRepInvoice,
  invoiceFileUrl,
  retryInvoiceEmail,
  recoverInvoiceCheck,
  type InvoiceRow,
} from "@/lib/rep-invoices.functions";
import {
  INVOICE_EMAIL,
  INVOICE_TIMEZONE,
  type InvoiceClaim,
} from "@/lib/invoice-check";

export const Route = createFileRoute("/_dashboard/invoices")({
  component: InvoicesPage,
});
const money = (c: number | null) =>
  c == null
    ? "Unavailable"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
      }).format(c / 100);
const stamp = (s: string) =>
  new Date(s).toLocaleString("en-AU", {
    timeZone: INVOICE_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";
const buttonClass =
  "rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
function InvoicesPage() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof listRepInvoices>
  > | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    number: "",
    from: "",
    to: "",
    hours: "",
    bookings: "",
    hourlyRate: "",
    bookingRate: "50",
    total: "",
  });
  async function refresh() {
    const next = await listRepInvoices();
    setData(next);
    setForm((f) => ({
      ...f,
      hourlyRate: f.hourlyRate || String(next.hourlyRate ?? ""),
    }));
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  const change = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a PDF no larger than 5 MB.");
      const pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      const claim: InvoiceClaim = {
        number: form.number,
        from: form.from,
        to: form.to,
        hours: Number(form.hours),
        bookings: Number(form.bookings),
        hourlyRate: Number(form.hourlyRate),
        bookingRate: Number(form.bookingRate),
        total: Number(form.total),
      };
      const result = await submitRepInvoice({ data: { claim, pdf } });
      setNotice(
        "Invoice saved and checked. Its result and email status are shown below.",
      );
      setFile(null);
      setFileKey((k) => k + 1);
      setSelected(result.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit invoice.");
    } finally {
      setBusy(false);
    }
  }
  async function openFile(id: string) {
    const popup = window.open("", "_blank");
    if (popup) popup.opener = null;
    try {
      const url = await invoiceFileUrl({ data: { id } });
      if (popup) popup.location.href = url;
      else window.location.assign(url);
    } catch (e) {
      popup?.close();
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function recover(id: string) {
    setBusy(true);
    try {
      await recoverInvoiceCheck({ data: { id } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function retry(id: string) {
    setBusy(true);
    try {
      await retryInvoiceEmail({ data: { id } });
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="mx-auto max-w-6xl p-5 md:p-10 text-slate-900"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Weekly payments
          </p>
          <h1 className="text-3xl font-semibold">Invoices</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Upload your invoice. We check the PDF, logged calling-session hours
            including breaks, and deposit-paid bookings against your portal
            records.
          </p>
        </div>
        <FileText className="mt-5 h-8 w-8 text-emerald-800" />
      </div>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </div>
      )}
      {!data && !error && (
        <p className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoices…
        </p>
      )}
      {data && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              [
                "Hourly rate",
                data.isAdmin
                  ? "Nina $25 · Bec $35"
                  : data.hourlyRate
                    ? `$${data.hourlyRate} / hour`
                    : "Needs configuration",
              ],
              ["Booking bonus", "$50 / deposit-paid booking"],
              ["Payment review", INVOICE_EMAIL],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 break-words text-sm font-semibold">
                  {value}
                </p>
              </div>
            ))}
          </div>
          {!data.isAdmin && (
            <form
              onSubmit={submit}
              className="mb-8 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-lg font-semibold">
                Submit this week’s invoice
              </h2>
              <p className="mt-1 mb-5 text-sm text-slate-500">
                Enter the figures exactly as printed on your PDF. Dates follow
                your WA workdays. Any mismatch or missing evidence is sent for
                review.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm">
                  Invoice number
                  <input
                    required
                    maxLength={80}
                    className={inputClass}
                    value={form.number}
                    onChange={(e) => change("number", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  First date on invoice
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={form.from}
                    onChange={(e) => change("from", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Last date on invoice
                  <input
                    required
                    type="date"
                    min={form.from}
                    className={inputClass}
                    value={form.to}
                    onChange={(e) => change("to", e.target.value)}
                  />
                </label>
                {(
                  [
                    ["hours", "Hours invoiced"],
                    ["hourlyRate", "Hourly rate ($)"],
                    ["bookings", "Bookings invoiced"],
                    ["bookingRate", "Per-booking rate ($)"],
                    ["total", "Invoice total ($)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <input
                      required
                      type="number"
                      min="0"
                      step={key === "bookings" ? "1" : "0.01"}
                      className={inputClass}
                      value={form[key]}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <label className="mt-5 block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
                <span className="mb-3 flex items-center gap-2 font-medium">
                  <Upload className="h-4 w-4" />
                  Original invoice PDF · maximum 5 MB
                </span>
                <input
                  key={fileKey}
                  required
                  type="file"
                  className="w-full min-w-0"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button disabled={busy || !file} className={buttonClass}>
                  {busy
                    ? "Saving and checking…"
                    : "Submit invoice for checking"}
                </button>
                <span className="text-xs text-slate-500">
                  The result is emailed to Peter. No money is transferred.
                </span>
              </div>
            </form>
          )}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {data.isAdmin ? "Team invoices" : "Your invoices"}
            </h2>
            <button
              className="text-sm text-emerald-800"
              onClick={() => refresh().catch((e) => setError(e.message))}
            >
              Refresh
            </button>
          </div>
          {!data.invoices.length && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No invoices submitted yet.
            </div>
          )}
          <div className="space-y-3">
            {data.invoices.map((row) => (
              <div
                key={row.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  onClick={() =>
                    setSelected(selected === row.id ? null : row.id)
                  }
                  className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <p className="font-medium">
                      {row.evidence.rep_name} · {row.invoice_number}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.period_from} – {row.period_to} ·{" "}
                      {money(Math.round(row.claim.total * 100))}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${row.status === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                    >
                      {row.status === "approved" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {row.status === "approved"
                        ? "Approved — ready to pay"
                        : row.status === "checking"
                          ? "Check incomplete"
                          : "Needs review"}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      Email:{" "}
                      {row.email_status === "sent"
                        ? "sent to Peter"
                        : row.email_status}
                    </p>
                  </div>
                </button>
                {selected === row.id && (
                  <div className="border-t border-slate-100 p-5">
                    <InvoiceDetails row={row} />
                    <div className="mt-4 flex gap-3">
                      <button
                        className={buttonClass}
                        onClick={() => openFile(row.id)}
                      >
                        Open original PDF
                      </button>
                      {data.isAdmin &&
                        ["failed", "pending", "sending"].includes(
                          row.email_status,
                        ) &&
                        row.status !== "checking" && (
                          <button
                            disabled={busy}
                            className={buttonClass}
                            onClick={() => retry(row.id)}
                          >
                            Retry email
                          </button>
                        )}
                      {data.isAdmin && row.status === "checking" && (
                        <button
                          disabled={busy}
                          className={buttonClass}
                          onClick={() => recover(row.id)}
                        >
                          Recover check
                        </button>
                      )}
                    </div>
                    {row.email_error && (
                      <p className="mt-3 text-sm text-red-700">
                        {row.email_error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Showing the latest 100 invoices. A check uses the records saved at
            submission. Missing evidence, unusual sessions and unsupported PDFs
            require review.
          </p>
        </>
      )}
    </div>
  );
}
function InvoiceDetails({ row }: { row: InvoiceRow }) {
  const r = row.result;
  if (!r)
    return (
      <p className="text-sm text-amber-800">
        This check has not completed. Do not submit a duplicate or pay it
        automatically. Ask an admin to recover the check.
      </p>
    );
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Check</th>
              <th>Invoiced</th>
              <th>System</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Hours (including breaks)", row.claim.hours, r.systemHours],
              ["Deposit-paid bookings", row.claim.bookings, r.systemBookings],
              [
                "Total",
                money(r.claimedTotalCents),
                money(r.expectedTotalCents),
              ],
            ].map((a) => (
              <tr key={a[0]} className="border-b border-slate-100">
                {a.map((v, i) => (
                  <td key={i} className="py-2">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.reasons.length > 0 ? (
        <ul className="my-4 list-disc space-y-1 pl-5 text-sm text-amber-900">
          {r.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p className="my-4 text-sm text-emerald-800">
          All required checks passed. Ready for Peter to pay.
        </p>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Session evidence ({row.evidence.sessions.length})
        </summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr>
                <th>Start (WA)</th>
                <th>End (WA)</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {row.evidence.sessions.map((s) => (
                <tr key={s.id}>
                  <td className="py-2">{stamp(s.started_at)}</td>
                  <td>{s.ended_at ? stamp(s.ended_at) : "Still open"}</td>
                  <td>
                    {s.verified && s.has_calls
                      ? "Verified session with calls"
                      : "Review required"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Booking evidence ({row.evidence.bookings.length})
        </summary>
        <ul className="mt-2 space-y-2 text-xs">
          {row.evidence.bookings.map((b) => (
            <li key={b.lead_id}>
              {b.patient_name || b.lead_id} · {stamp(b.earned_at)} ·{" "}
              {b.verified
                ? "Deposit-paid booking recorded"
                : "Historical record — review"}
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-4 text-xs text-slate-500">
        Checked {stamp(row.evidence.captured_at)} WA time. Hours rounded once to
        two decimal places. Difference: {money(r.differenceCents)}.
      </p>
    </>
  );
}

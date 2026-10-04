import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Upload, Loader2 } from "lucide-react";
import {
  listPersonalInvoices,
  uploadPersonalInvoice,
  personalInvoiceUrl,
} from "@/lib/rep-invoices.functions";

export const Route = createFileRoute("/_dashboard/invoices")({
  component: InvoicesPage,
});
type Invoice = Awaited<
  ReturnType<typeof listPersonalInvoices>
>["invoices"][number];
function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  async function load(offset = 0) {
    setLoading(true);
    try {
      const next = await listPersonalInvoices({ data: { offset } });
      setInvoices((old) =>
        offset ? [...old, ...next.invoices] : next.invoices,
      );
      setHasMore(next.hasMore);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load().catch(() =>
      setError("Could not load your invoices. Please refresh."),
    );
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (file.size > 5242880)
        throw new Error("Choose a PDF no larger than 5 MB.");
      const pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      await uploadPersonalInvoice({ data: { name: file.name, pdf } });
      setFile(null);
      setFileKey((k) => k + 1);
      setNotice("Invoice uploaded.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload invoice.");
    } finally {
      setBusy(false);
    }
  }
  async function openFile(key: string) {
    const popup = window.open("", "_blank");
    if (popup) popup.opener = null;
    try {
      const url = await personalInvoiceUrl({ data: { key } });
      if (popup) popup.location.href = url;
      else window.location.assign(url);
    } catch {
      popup?.close();
      setError("Could not open your invoice. Please try again.");
    }
  }
  return (
    <div className="mx-auto max-w-3xl p-5 md:p-10 text-slate-900">
      <h1 className="mb-8 text-3xl font-semibold">Invoices</h1>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="mb-4 text-lg font-semibold">Upload invoice</h2>
        <label
          htmlFor="invoice-pdf"
          className="mb-2 block text-sm text-slate-500"
        >
          PDF, up to 5 MB
        </label>
        <input
          id="invoice-pdf"
          key={fileKey}
          required
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full min-w-0 rounded-lg border border-slate-200 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2"
        />
        <button
          disabled={!file || busy}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {busy ? "Uploading…" : "Upload invoice"}
        </button>
      </form>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">My invoices</h2>
          <button
            type="button"
            disabled={loading || busy}
            onClick={() => {
              setError("");
              load().catch(() => setError("Could not load your invoices."));
            }}
            className="text-sm text-slate-600 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        {loading && !invoices.length ? (
          <p role="status" className="text-sm text-slate-500">
            Loading invoices…
          </p>
        ) : !invoices.length ? (
          <p className="py-5 text-sm text-slate-500">
            No invoices uploaded yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <li key={invoice.key} className="flex items-center gap-3 py-4">
                <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">
                    {invoice.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Uploaded{" "}
                    {invoice.createdAt
                      ? new Date(invoice.createdAt).toLocaleString("en-AU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openFile(invoice.key)}
                  aria-label={`View ${invoice.name}`}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <button
            disabled={loading}
            onClick={() =>
              load(invoices.length).catch(() =>
                setError("Could not load more invoices."),
              )
            }
            className="mt-4 text-sm text-emerald-900"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </section>
    </div>
  );
}

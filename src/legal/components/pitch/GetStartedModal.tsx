// Ported from the Legal app (family-law-floater/src/components/pitch/GetStartedModal.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { Check, X } from "lucide-react";

import { formatCurrency } from "./deck-utils";

const PACKS = [10, 20, 50];

export function GetStartedModal({
  open,
  onClose,
  pricePerShow,
}: {
  open: boolean;
  onClose: () => void;
  pricePerShow: number;
}) {
  const [pack, setPack] = useState(20);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    firmName: "",
    contactName: "",
    email: "",
    mobile: "",
    notes: "",
  });

  if (!open) return null;

  const subtotal = pack * pricePerShow;
  const total = subtotal * 1.1;

  const field = (
    id: keyof typeof form,
    label: string,
    type = "text",
  ) => (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold tracking-wide uppercase">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={id !== "notes"}
        className="w-full focus-visible:ring-2 focus-visible:ring-ring"
        value={form[id]}
        onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
      />
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get started"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4"
    >
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 md:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>

        {sent ? (
          <div className="py-10 text-center">
            <Check className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-2xl font-extrabold tracking-tight">You're all set.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We've got your details — we'll be in touch to get your pack running.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-extrabold tracking-tight">Get Started</h3>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                console.log("Get started payload", { ...form, pack, subtotal, total });
                setSent(true);
              }}
            >
              {field("firmName", "Firm name")}
              {field("contactName", "Contact name")}
              {field("email", "Email", "email")}
              {field("mobile", "Mobile", "tel")}

              <div>
                <span className="mb-2 block text-xs font-semibold tracking-wide uppercase">
                  Preferred pack size
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {PACKS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPack(p)}
                      className={`rounded-lg border px-3 py-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        pack === p
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {p} shows
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-xs font-semibold tracking-wide uppercase"
                >
                  Anything we should know?
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
                  Pack total
                </p>
                <p className="mt-1 text-2xl font-extrabold">{formatCurrency(total)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(subtotal)} + GST · {pack} showed appointments
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-bold tracking-[0.15em] text-primary-foreground uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

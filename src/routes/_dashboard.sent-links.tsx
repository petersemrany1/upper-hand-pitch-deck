import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Mail, MessageSquare, ExternalLink, Search, FileText, CreditCard, Trash2, StickyNote, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendPaymentLinkSMS } from "@/utils/twilio.functions";
import { sendInvoiceEmail } from "@/utils/resend.functions";
import { createStripeCheckoutSession } from "@/utils/stripe.functions";
import { recordSentLink, updateSentLinkMethod, deleteSentLink, updateSentLinkNotes } from "@/utils/sent-links.functions";

export const Route = createFileRoute("/_dashboard/sent-links")({
  component: SentLinksPage,
});

type SentLink = {
  id: string;
  kind: string;
  clinic_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  package_name: string;
  shows: number;
  per_show_fee: number;
  total_exc_gst: number;
  gst: number;
  total_inc_gst: number;
  stripe_url: string | null;
  send_method: string;
  created_at: string;
  notes: string | null;
};

const fmt = (n: number) => "$" + Math.round(Number(n)).toLocaleString();
const fmtDate = (s: string) => new Date(s).toLocaleString("en-AU", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});

function SentLinksPage() {
  const [rows, setRows] = useState<SentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sendSMSFn = useServerFn(sendPaymentLinkSMS);
  const sendInvoiceEmailFn = useServerFn(sendInvoiceEmail);
  const createCheckoutFn = useServerFn(createStripeCheckoutSession);
  const recordSentLinkFn = useServerFn(recordSentLink);
  const updateSentLinkMethodFn = useServerFn(updateSentLinkMethod);
  const deleteSentLinkFn = useServerFn(deleteSentLink);
  const updateSentLinkNotesFn = useServerFn(updateSentLinkNotes);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sent_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as SentLink[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.clinic_name.toLowerCase().includes(q) ||
      r.contact_name.toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      r.package_name.toLowerCase().includes(q)
    );
  });

  const resend = async (row: SentLink, method: "email" | "sms") => {
    if (row.kind !== "payment_link") return;
    setBusyId(row.id);
    setToast(null);
    try {
      let url = row.stripe_url;
      if (!url) {
        const c = await createCheckoutFn({
          data: {
            clinicName: row.clinic_name,
            contactName: row.contact_name,
            email: row.email ?? "",
            packageName: row.package_name,
            totalIncGst: Number(row.total_inc_gst),
          },
        });
        if (!c.success) {
          setToast({ type: "error", msg: c.error || "Could not generate Stripe link." });
          setBusyId(null);
          return;
        }
        url = c.url;
      }

      if (method === "email") {
        if (!row.email) {
          setToast({ type: "error", msg: "No email on this record." });
          setBusyId(null);
          return;
        }
        const r = await sendInvoiceEmailFn({
          data: {
            to: row.email,
            clinicName: row.clinic_name,
            contactName: row.contact_name,
            phone: row.phone ?? "",
            packageName: row.package_name,
            amount: fmt(Number(row.total_inc_gst)),
            stripeLink: url!,
          },
        });
        if (!r.success) {
          setToast({ type: "error", msg: r.error || "Email send failed." });
          setBusyId(null);
          return;
        }
      } else {
        if (!row.phone) {
          setToast({ type: "error", msg: "No phone on this record." });
          setBusyId(null);
          return;
        }
        const firstName = row.contact_name.trim().split(" ")[0];
        const r = await sendSMSFn({ data: { to: row.phone, firstName, stripeLink: url! } });
        if (!r.success) {
          setToast({ type: "error", msg: r.error || "SMS send failed." });
          setBusyId(null);
          return;
        }
      }

      await recordSentLinkFn({
        data: {
          kind: "payment_link",
          clinicName: row.clinic_name,
          contactName: row.contact_name,
          email: row.email,
          phone: row.phone,
          packageName: row.package_name,
          shows: row.shows,
          perShowFee: Number(row.per_show_fee),
          totalExcGst: Number(row.total_exc_gst),
          gst: Number(row.gst),
          totalIncGst: Number(row.total_inc_gst),
          stripeUrl: url,
          sendMethod: method,
        },
      });

      if (!row.stripe_url && url) {
        await updateSentLinkMethodFn({ data: { id: row.id, method: row.send_method as "email" | "sms" | "both" } });
      }

      setToast({ type: "success", msg: "Resent via " + (method === "email" ? "email" : "SMS") + "." });
      await load();
    } catch {
      setToast({ type: "error", msg: "Something went wrong — please try again." });
    }
    setBusyId(null);
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setToast(null);
    try {
      const r = await deleteSentLinkFn({ data: { id } });
      if (!r.success) {
        setToast({ type: "error", msg: r.error || "Could not delete." });
      } else {
        setRows((prev) => prev.filter((x) => x.id !== id));
        setToast({ type: "success", msg: "Deleted." });
      }
    } catch {
      setToast({ type: "error", msg: "Could not delete — please try again." });
    }
    setConfirmDeleteId(null);
    setBusyId(null);
  };

  const startEditNotes = (row: SentLink) => {
    setEditingNotesId(row.id);
    setNotesDraft(row.notes ?? "");
  };

  const cancelEditNotes = () => {
    setEditingNotesId(null);
    setNotesDraft("");
  };

  const saveNotes = async (id: string) => {
    setBusyId(id);
    setToast(null);
    try {
      const r = await updateSentLinkNotesFn({ data: { id, notes: notesDraft } });
      if (!r.success) {
        setToast({ type: "error", msg: r.error || "Could not save note." });
      } else {
        setRows((prev) => prev.map((x) => (x.id === id ? { ...x, notes: notesDraft } : x)));
        setEditingNotesId(null);
        setNotesDraft("");
        setToast({ type: "success", msg: "Note saved." });
      }
    } catch {
      setToast({ type: "error", msg: "Could not save note — please try again." });
    }
    setBusyId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Send className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Sent Links
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Every payment link and contract sent to a clinic. Resend any record via email or SMS.
      </p>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clinic, contact, email or phone…"
          className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {toast && (
        <div className={"mb-4 rounded-lg border p-3 text-sm " +
          (toast.type === "success"
            ? "border-green-500/40 bg-green-500/10 text-green-300"
            : "border-red-500/40 bg-red-500/10 text-red-300")
        }>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "No links sent yet. Use the Get Started flow on the Pitch Deck to send your first one."
              : "No matches for your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isContract = r.kind === "contract";
            const busy = busyId === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
                        (isContract ? "bg-purple-500/15 text-purple-300" : "bg-primary/15 text-primary")
                      }>
                        {isContract ? <FileText className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {isContract ? "Contract" : "Payment Link"}
                      </span>
                      <span className="text-sm font-bold text-foreground truncate">{r.clinic_name}</span>
                      <span className="text-xs text-muted-foreground">· {r.contact_name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>{r.package_name} — {r.shows} shows</span>
                      <span>·</span>
                      <span className="font-semibold text-foreground">{fmt(Number(r.total_inc_gst))} inc GST</span>
                      <span>·</span>
                      <span>via {r.send_method}</span>
                      <span>·</span>
                      <span>{fmtDate(r.created_at)}</span>
                    </div>
                    {(r.email || r.phone) && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {r.email && <span>{r.email}</span>}
                        {r.email && r.phone && <span> · </span>}
                        {r.phone && <span>{r.phone}</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isContract && r.stripe_url && (
                      <a
                        href={r.stripe_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                    )}
                    {!isContract && (
                      <>
                        <button
                          onClick={() => resend(r, "email")}
                          disabled={busy || !r.email}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" /> {busy ? "…" : "Resend Email"}
                        </button>
                        <button
                          onClick={() => resend(r, "sms")}
                          disabled={busy || !r.phone}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> {busy ? "…" : "Resend SMS"}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => (editingNotesId === r.id ? cancelEditNotes() : startEditNotes(r))}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <StickyNote className="w-3.5 h-3.5" /> {r.notes ? "Edit Note" : "Add Note"}
                    </button>
                    {confirmDeleteId === r.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> {busy ? "…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>

                {editingNotesId === r.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={3}
                      placeholder="Add a note about this send (e.g. follow-up reminders, context)…"
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveNotes(r.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        <Check className="w-3.5 h-3.5" /> {busy ? "Saving…" : "Save Note"}
                      </button>
                      <button
                        onClick={cancelEditNotes}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : r.notes ? (
                  <div className="mt-3 rounded-lg bg-muted/50 border border-border p-3 text-xs text-foreground whitespace-pre-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      <StickyNote className="w-3 h-3" /> Note
                    </span>
                    <div>{r.notes}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

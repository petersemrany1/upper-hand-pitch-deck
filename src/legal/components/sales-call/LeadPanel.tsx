// Ported from the Legal app (family-law-floater/src/components/sales-call/LeadPanel.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { firmAllocatesLawyer, ANY_AVAILABLE_LAWYER_LABEL } from "@/legal/lib/firm-lawyer-allocation";
import { CheckCircle2, CreditCard, Loader2, MessageCircle, Pencil, Send, X } from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import { LEAD_STATUSES } from "@/legal/lib/client-leads";
import type { Firm, FirmLawyer } from "@/legal/lib/partner-firms";
import { OBJECTIONS, type CallLead, type CallRecord } from "@/legal/lib/sales-call";
import { OBJECTION_CARDS } from "@/legal/lib/sales-script";
import { CallHistory } from "./call-history";
import { FirmOffices } from "@/legal/components/firm-portal/FirmOffices";
import type { FirmLocationNotes } from "@/legal/lib/firm-location";
import { ClientDetails } from "./client-details";

// Rates for people who aren't in the firm's lawyer list (e.g. paralegals), and a
// fallback for lawyers whose hourly rate hasn't been filled in yet.
const FALLBACK_RATES: Record<string, { name: string; position: string; rate: number }[]> = {
  "Quill Legal": [
    { name: "Shams Ahmad", position: "Principal Solicitor", rate: 650 },
    { name: "Jennifer Mouhaweg", position: "Senior Associate", rate: 500 },
    { name: "Robert McCarthy", position: "Senior Associate", rate: 500 },
    { name: "Nicole Contreras", position: "Solicitor", rate: 400 },
    { name: "Khalil Marouch", position: "Solicitor", rate: 350 },
    { name: "Paralegal Staff", position: "Paralegal", rate: 250 },
  ],
};

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="border-b py-2 last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-line text-[13px] leading-snug">{value}</p>
    </div>
  );
}

type RateRow = {
  key: string;
  lawyerId: string | null;
  name: string;
  position: string;
  rate: number | null;
};

export function FirmInfoCard({
  firms,
  selectedFirmId,
  onSelectFirm,
  lawyers,
  selectedLawyerId,
  onSelectLawyer,
  onSaveFirmLocation,
}: {
  firms: Firm[];
  selectedFirmId: string | null;
  onSelectFirm: (id: string) => void;
  lawyers: FirmLawyer[];
  selectedLawyerId: string | null;
  onSelectLawyer: (id: string | null) => void;
  onSaveFirmLocation?: ((firmId: string, notes: FirmLocationNotes) => Promise<void>) | undefined;
}) {
  const firm = firms.find((f) => f.id === selectedFirmId) ?? null;
  const firmAllocates = firmAllocatesLawyer(selectedFirmId);
  const lawyer = lawyers.find((l) => l.id === selectedLawyerId) ?? null;

  const fallback = firm ? (FALLBACK_RATES[firm.firm_name.trim()] ?? []) : [];
  const fallbackRate = (name: string) =>
    fallback.find((r) => r.name.toLowerCase() === name.trim().toLowerCase())?.rate ?? null;
  const rows: RateRow[] = [
    ...lawyers
      .filter((l) => l.is_active)
      .map((l) => ({
        key: l.id,
        lawyerId: l.id,
        name: l.name,
        position: l.title ?? "",
        rate: l.hourly_rate ?? fallbackRate(l.name),
      })),
    ...fallback
      .filter((r) => !lawyers.some((l) => l.name.trim().toLowerCase() === r.name.toLowerCase()))
      .map((r) => ({
        key: r.name,
        lawyerId: null,
        name: r.name,
        position: r.position,
        rate: r.rate,
      })),
  ];

  const bookableRows = rows.filter((row) => row.lawyerId !== null);
  const guideRows = rows.filter((row) => row.lawyerId === null);

  return (
    <section aria-label="Firm and lawyer" className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center gap-2">
        <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Firm & lawyer
        </h3>
        <Select value={selectedFirmId ?? ""} onValueChange={onSelectFirm}>
          <SelectTrigger aria-label="Choose a firm" className="h-7 min-w-0 flex-1 px-2 text-xs">
            <SelectValue placeholder="Choose a firm" />
          </SelectTrigger>
          <SelectContent>
            {firms
              .filter((f) => f.is_active || f.id === selectedFirmId)
              .map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.firm_name}
                  {f.city ? ` — ${f.city}` : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {!firm ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Choose a firm to see its location and lawyers.
        </p>
      ) : (
        <>
          <div className="mt-3"><FirmOffices key={firm.id} firmId={firm.id} canEdit={Boolean(onSaveFirmLocation)} /></div>
          {firm.notes?.trim() ? <Detail label="Notes" value={firm.notes} /> : null}
          <div className="mt-2 overflow-hidden rounded-md border">
            <div className="flex items-center justify-between border-b bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              <span>Lawyer</span>
              <span>Hourly +GST</span>
            </div>
            {firmAllocates && (
              <button
                type="button"
                onClick={() => onSelectLawyer(null)}
                aria-pressed={selectedLawyerId === null}
                className={`w-full border-b px-2 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selectedLawyerId === null ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <span className="block font-medium">{ANY_AVAILABLE_LAWYER_LABEL}</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">Trilogy will allocate the lawyer.</span>
              </button>
            )}
            {bookableRows.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {firmAllocates ? "You can book without choosing a named lawyer." : "No active lawyers added yet."}
              </p>
            ) : (
              bookableRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => onSelectLawyer(row.lawyerId!)}
                  aria-pressed={row.lawyerId === selectedLawyerId}
                  className={`flex w-full items-center justify-between gap-2 border-b px-2 py-1.5 text-left text-xs last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${row.lawyerId === selectedLawyerId ? "bg-primary/10" : "hover:bg-muted/50"}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{row.name}</span>
                    {row.position ? (
                      <span className="block text-[10px] leading-4 text-muted-foreground">
                        {row.position}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {row.rate != null ? AUD.format(row.rate) : "Not set"}
                  </span>
                </button>
              ))
            )}
          </div>
          {firmAllocates && bookableRows.length > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">Only select a name if Trilogy has confirmed the lawyer.</p>
          )}
          {guideRows.length > 0 ? (
            <details key={`rates-${firm.id}`} className="mt-2 text-xs">
              <summary className="cursor-pointer text-[11px] text-muted-foreground">
                Firm rate guide
              </summary>
              <ul className="mt-1 divide-y">
                {guideRows.map((row) => (
                  <li key={row.key} className="flex items-start justify-between gap-2 py-1.5">
                    <span className="min-w-0">
                      <span className="block">{row.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {row.position}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {row.rate != null ? AUD.format(row.rate) : "Not set"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Reference rates, plus GST. Select an active lawyer above to book.
              </p>
            </details>
          ) : null}
          {lawyer &&
          (lawyer.accredited_specialist ||
            lawyer.years_experience ||
            lawyer.specialties ||
            lawyer.what_makes_them_different ||
            lawyer.talking_points) ? (
            <details key={lawyer.id} className="mt-2 border-t pt-2 text-xs">
              <summary className="cursor-pointer font-medium">About {lawyer.name}</summary>
              {lawyer.accredited_specialist ? (
                <p className="mt-2 text-[11px] text-emerald-600">Accredited specialist</p>
              ) : null}
              <Detail
                label="Experience"
                value={lawyer.years_experience ? `${lawyer.years_experience} years` : null}
              />
              <Detail label="Specialties" value={lawyer.specialties} />
              <Detail label="What makes them different" value={lawyer.what_makes_them_different} />
              <Detail label="Talking points" value={lawyer.talking_points} />
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

export function LeadPanel({
  lead,
  exPartner,
  onExPartnerChange,
  onExPartnerSave,
  onStatus,
  callbackAt,
  onCallbackAt,
  onCallbackSave,
  onObjection,
  calls,
  callsLoading = false,
  callsError = false,
  callsRefreshing = false,
  onRefreshCalls,
  onNextLead,
  depositPaid,
  depositLinkSent,
  sendingDepositLink,
  onSendDepositLink,
  onTakeDepositManually,
  onOpenInbox,
  unreadCount,
  onSaveName,
  firms,
  selectedFirmId,
  onSelectFirm,
  lawyers,
  selectedLawyerId,
  onSelectLawyer,
  onSaveFirmLocation,
}: {
  lead: CallLead;
  exPartner: string;
  onExPartnerChange: (v: string) => void;
  onExPartnerSave: () => void;
  onStatus: (status: string) => void;
  callbackAt: string;
  onCallbackAt: (v: string) => void;
  onCallbackSave: () => void;
  onObjection: (objection: string) => void;
  calls: CallRecord[];
  callsLoading?: boolean;
  callsError?: boolean;
  callsRefreshing?: boolean;
  onRefreshCalls?: () => void;
  onNextLead: () => void;
  depositPaid: boolean;
  depositLinkSent: boolean;
  sendingDepositLink: boolean;
  onSendDepositLink: () => void;
  onTakeDepositManually: () => void;
  onOpenInbox: () => void;
  unreadCount: number;
  onSaveName: (first: string, last: string) => void;
  firms: Firm[];
  selectedFirmId: string | null;
  onSelectFirm: (id: string) => void;
  lawyers: FirmLawyer[];
  selectedLawyerId: string | null;
  onSelectLawyer: (id: string | null) => void;
  onSaveFirmLocation?: ((firmId: string, notes: FirmLocationNotes) => Promise<void>) | undefined;
}) {
  const exEmpty = !exPartner.trim();
  const leadName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Lead";
  const [editingName, setEditingName] = useState(false);
  const [openObjection, setOpenObjection] = useState<string | null>(null);
  const objectionCard = OBJECTION_CARDS.find((c) => c.chip === openObjection) ?? null;
  // A new lead starts with no objection card open.
  useEffect(() => setOpenObjection(null), [lead.id]);
  const [firstName, setFirstName] = useState(lead.first_name ?? "");
  const [lastName, setLastName] = useState(lead.last_name ?? "");

  const openNameEdit = () => {
    setFirstName(lead.first_name ?? "");
    setLastName(lead.last_name ?? "");
    setEditingName(true);
  };

  const saveName = () => {
    onSaveName(firstName.trim(), lastName.trim());
    setEditingName(false);
  };

  return (
    <div aria-label="Sales call sidebar" className="flex h-full min-h-0 flex-col p-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        {editingName ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Input
              className="h-8 text-[13px]"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
            <Input
              className="h-8 text-[13px]"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
            <Button size="sm" className="h-8 px-2" onClick={saveName}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => setEditingName(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 title={leadName} className="truncate text-base font-semibold tracking-tight">
              {leadName}
            </h2>
            <button
              type="button"
              onClick={openNameEdit}
              aria-label="Edit client name"
              title="Edit client name"
              className="rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onNextLead}
          className="shrink-0 text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Next lead →
        </button>
      </div>

      <ClientDetails key={lead.id} lead={lead} />

      <div
        aria-label="Call preparation"
        className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pb-1"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">Status</h3>
          <div>
            {(() => {
              const s = LEAD_STATUSES.find((x) => x.value === lead.status);
              if (!s) return <span className="text-[13px] text-muted-foreground">—</span>;
              return (
                <div
                  className="flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[11px] font-medium"
                  style={{ borderColor: s.color }}
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </div>
              );
            })()}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ex-partner">
              Ex-partner full name
            </label>
            {exEmpty ? (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                Required
              </span>
            ) : null}
          </div>
          <Input
            id="ex-partner"
            className="mt-1 h-8 text-xs"
            value={exPartner}
            onChange={(e) => onExPartnerChange(e.target.value)}
            onBlur={onExPartnerSave}
            placeholder="Full name"
          />
        </div>

        <FirmInfoCard
          firms={firms}
          selectedFirmId={selectedFirmId}
          onSelectFirm={onSelectFirm}
          lawyers={lawyers}
          selectedLawyerId={selectedLawyerId}
          onSelectLawyer={onSelectLawyer}
          onSaveFirmLocation={onSaveFirmLocation}
        />

        {lead.status === "callback_scheduled" ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="callback-at">
              Callback date & time
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                id="callback-at"
                type="datetime-local"
                value={callbackAt}
                onChange={(e) => onCallbackAt(e.target.value)}
              />
              <Button variant="outline" onClick={onCallbackSave}>
                Save
              </Button>
            </div>
          </div>
        ) : null}

        <details key={`objections-${lead.id}`} className="border-t pt-2">
          <summary className="cursor-pointer text-xs font-medium">Objection prompts</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OBJECTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  // Log it when the card opens; tapping again just closes it.
                  if (openObjection !== o) onObjection(o);
                  setOpenObjection((cur) => (cur === o ? null : o));
                }}
                aria-pressed={openObjection === o}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  openObjection === o
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          {objectionCard ? (
            <div className="mt-2 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 text-[13px] leading-relaxed">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  {objectionCard.chip} — say this
                </p>
                <button
                  type="button"
                  onClick={() => setOpenObjection(null)}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {objectionCard.say.map((line) => (
                <p key={line} className="mt-1.5">
                  {line}
                </p>
              ))}
              <p className="mt-1.5 text-[12px] text-destructive">
                <span className="font-semibold">Never:</span> {objectionCard.never}
              </p>
            </div>
          ) : null}
        </details>

        <details key={`history-${lead.id}`} className="border-t pt-2">
          <summary className="cursor-pointer text-xs font-medium">
            Call history ({calls.length})
          </summary>
          <CallHistory
            calls={calls}
            loading={callsLoading}
            error={callsError}
            refreshing={callsRefreshing}
            onRefresh={onRefreshCalls}
          />
        </details>
      </div>

      <section aria-label="Deposit and messages" className="mt-2 shrink-0 border-t pt-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Deposit
          </h3>
          {depositPaid ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Paid
            </span>
          ) : depositLinkSent ? (
            <span className="text-[10px] font-medium text-primary">Link sent</span>
          ) : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] gap-1.5">
          <Button
            size="sm"
            className="min-w-0 gap-1.5 px-2 text-[11px]"
            variant="outline"
            onClick={onSendDepositLink}
            disabled={depositPaid || sendingDepositLink}
            aria-label={depositLinkSent ? "Resend deposit link" : "Send deposit link"}
            title={depositLinkSent ? "Resend deposit link" : "Send deposit link"}
          >
            {sendingDepositLink ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {depositLinkSent ? "Resend link" : "Send link"}
          </Button>
          <Button
            size="sm"
            className="min-w-0 gap-1.5 px-2 text-[11px]"
            onClick={onTakeDepositManually}
            disabled={depositPaid}
            aria-label="Take deposit manually"
            title="Take deposit manually"
          >
            <CreditCard className="h-3.5 w-3.5" /> Take deposit
          </Button>
          <Button
            size="icon"
            className="relative h-8 w-8"
            variant="secondary"
            onClick={onOpenInbox}
            aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} unread messages` : "Inbox"}
            title="Inbox"
          >
            <MessageCircle className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-3.5 rounded-full bg-primary px-1 text-[9px] leading-3.5 text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Button>
        </div>
      </section>
    </div>
  );
}

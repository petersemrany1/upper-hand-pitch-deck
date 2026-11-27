// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmPackBalanceCard.tsx). Re-run the port script to refresh.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/legal/integrations/supabase/client";
import { sydneyTodayISO } from "@/legal/lib/timezone";
import { firmShowRate, type AttendanceAppointment } from "@/legal/lib/firm-show-rate";
import { setPackOnHoldFn } from "@/legal/lib/firm-portal.functions";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { Switch } from "@/legal/components/ui/switch";
import { FirmAddPackDialog } from "./FirmAddPackDialog";
import { collectPages } from "@/legal/lib/collect-pages";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/legal/components/ui/dialog";

import { countPortalCredits, creditBalance, isCountedPack } from "@/legal/lib/firm-portal-credits";

type Pack = {
  id: string;
  firm_id: string;
  pack_size: number;
  price_per_show: number;
  purchased_at: string;
  status: "active" | "completed" | "voided";
  on_hold: boolean;
  created_at: string;
};

export function FirmPackBalanceCard({
  firmId,
  isAdmin,
  refreshKey = 0,
  appointments,
}: {
  firmId: string;
  isAdmin: boolean;
  refreshKey?: number;
  appointments: AttendanceAppointment[];
}) {
  const setPackOnHold = useServerFn(setPackOnHoldFn);
  const [packs, setPacks] = useState<Pack[]>([]);
  const { delivered, bookedSlots, noShows } = countPortalCredits(appointments, firmId);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const attendance = firmShowRate(appointments, firmId, now);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const packRows = await collectPages((from, to) =>
        supabase
          .from("firm_packs")
          .select("*")
          .eq("firm_id", firmId)
          .order("purchased_at", { ascending: true })
          .order("id")
          .range(from, to),
      );
      setPacks((packRows ?? []) as Pack[]);
    } catch {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [firmId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // FIFO allocation: fill oldest packs first
  const { activePack, totalRemaining, totalCapacity } = useMemo(() => {
    const sorted = packs
      .filter(isCountedPack)
      .sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));
    let remaining = delivered;
    let active: Pack | null = null;
    let deliveredIn = 0;
    for (const p of sorted) {
      if (remaining >= p.pack_size) {
        remaining -= p.pack_size;
        continue;
      }
      active = p;
      deliveredIn = remaining;
      remaining = 0;
      break;
    }
    if (!active && sorted.length > 0) {
      active = sorted[sorted.length - 1] ?? null;
      deliveredIn = active?.pack_size ?? 0;
    }
    const totalCap = sorted.reduce((s, p) => s + p.pack_size, 0);
    const totalRem = creditBalance(totalCap, bookedSlots);
    return {
      activePack: active,
      deliveredInActive: deliveredIn,
      sizeOfActive: active?.pack_size ?? 0,
      totalRemaining: totalRem,
      totalCapacity: totalCap,
    };
  }, [packs, delivered, bookedSlots]);

  const reserved = Math.max(0, bookedSlots - delivered);
  const noPacks = !packs.some(isCountedPack);
  const low = !noPacks && totalRemaining <= 3;
  const holdPack = packs.find((pack) => pack.status === "active" && pack.on_hold) ?? activePack;
  const activeOnHold = packs.some((pack) => pack.status === "active" && pack.on_hold);

  const toggleHold = async () => {
    if (!holdPack) return;
    try {
      await setPackOnHold({ data: { packId: holdPack.id, onHold: !holdPack.on_hold } });
      toast.success(holdPack.on_hold ? "Pack resumed" : "Pack put on hold");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update pack");
    }
  };

  return (
    <section className="portal-credits" aria-label="Pack credit">
      <div className="portal-credits-heading">
        <div className="flex items-center gap-3">
          <h2>Credits</h2>
          {!loading && !loadError && (activeOnHold || low) && (
            <span className="portal-credit-status">
              <span aria-hidden="true">●</span>{" "}
              {activeOnHold
                ? "On hold"
                : totalRemaining < 0
                  ? "Credits owing"
                  : totalRemaining === 0
                    ? "Empty"
                    : "Low"}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {activePack && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={activeOnHold} onCheckedChange={() => void toggleHold()} />
                On hold
              </label>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
            >
              History{" "}
              {showHistory ? (
                <ChevronUp className="ml-1 h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              )}
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add pack
            </Button>
          </div>
        )}
        {!isAdmin && (
          <Button size="sm" disabled={loading || loadError} onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Pack
          </Button>
        )}
      </div>
      {loading ? (
        <div
          className="h-24 animate-pulse rounded-lg bg-muted"
          aria-label="Loading credits"
          role="status"
        />
      ) : loadError ? (
        <div role="alert" className="py-5 text-sm text-destructive">
          Could not load your credits.{" "}
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="portal-credit-grid">
            <div className={`portal-credit-available ${low ? "is-low" : ""}`}>
              <strong>{totalRemaining.toLocaleString()}</strong>
              <span>credits available</span>
            </div>
            <dl className="portal-credit-stats">
              <div>
                <dt>Reserved</dt>
                <dd>{reserved.toLocaleString()}</dd>
                <span>booked consults</span>
              </div>
              <div>
                <dt>Used</dt>
                <dd>{delivered.toLocaleString()}</dd>
                <span>delivered</span>
              </div>
              <div>
                <dt>Bought</dt>
                <dd>{totalCapacity.toLocaleString()}</dd>
                <span>all time</span>
              </div>
              <div>
                <dt>Show rate</dt>
                <dd>
                  {attendance.percentage === null ? "—" : `${Math.round(attendance.percentage)}%`}
                </dd>
                <span>{attendance.past ? "all past consults" : "no past consults"}</span>
              </div>
            </dl>
          </div>
          <details className="portal-credit-help">
            <summary>
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              How show rate works
            </summary>
            <p>
              {attendance.past
                ? `${attendance.past - attendance.noShows} of ${attendance.past} past consultations counted as attended; ${attendance.noShows} marked no-show. `
                : "Your show rate appears after your first consultation. "}
              Past consultations count as attended unless marked no-show. Upcoming, cancelled,
              disqualified and test appointments are excluded. This does not change your credit
              balance. Repeat no-shows for the same client at this firm count once in both the
              no-show total and the show-rate calculation.
            </p>
          </details>
          {noShows > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {noShows} no-show{noShows === 1 ? "" : "s"} · no credits used
            </p>
          )}
          {(activeOnHold || noPacks || low) && (
            <p className="portal-credit-notice">
              {activeOnHold
                ? "Bookings are paused while this pack is on hold."
                : totalRemaining < 0
                  ? `${-totalRemaining} ${totalRemaining === -1 ? "credit is" : "credits are"} owing. Your next purchased pack first covers these advance bookings.`
                  : noPacks
                    ? isAdmin
                      ? "Add a pack to make credits available for bookings."
                      : "Contact Bold to set up your first pack and agreed rate."
                    : totalRemaining === 0
                      ? isAdmin
                        ? "No credits available — add a pack to continue bookings."
                        : "No credits available — select Add Pack to top up."
                      : `${totalRemaining} ${totalRemaining === 1 ? "credit" : "credits"} left — add a pack soon.`}
            </p>
          )}
          <details className="portal-credit-help">
            <summary>
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              How credits work
            </summary>
            <p>
              Each booked consultation reserves one credit. Once the client attends, it moves to
              Used. Cancelled, no-show and disqualified appointments do not use a credit.
              Appointments awaiting an outcome remain reserved. Advance bookings can take the
              balance below zero; buying five credits at −1 leaves four available.
            </p>
          </details>
          {showHistory && isAdmin && (
            <PackHistoryList packs={packs} delivered={delivered} onChange={load} />
          )}
        </>
      )}
      {showAdd && isAdmin && (
        <AddPackModal
          firmId={firmId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            void load();
          }}
        />
      )}
      {showAdd && !isAdmin && (
        <FirmAddPackDialog
          firmId={firmId}
          balance={totalRemaining}
          onClose={() => setShowAdd(false)}
          onAdded={() => void load()}
        />
      )}
    </section>
  );
}

function PackHistoryList({
  packs,
  delivered,
  onChange,
}: {
  packs: Pack[];
  delivered: number;
  onChange: () => void;
}) {
  const sorted = [...packs].sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));
  let remaining = delivered;
  const rows = sorted.map((p) => {
    const del = isCountedPack(p) ? Math.min(p.pack_size, remaining) : 0;
    remaining -= del;
    return { p, delivered: del };
  });

  const del = async (id: string) => {
    if (!confirm("Delete this pack? This affects the balance calculation.")) return;
    const { error } = await supabase.from("firm_packs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pack deleted");
    onChange();
  };

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Pack history
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ p, delivered: d }) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg bg-muted px-3.5 py-2.5 text-sm"
          >
            <div>
              <strong className="text-foreground">
                {d} / {p.pack_size}
              </strong>{" "}
              delivered
              <span className="ml-2.5 text-muted-foreground">
                {isCountedPack(p) ? "purchased" : "voided — not purchased"}{" "}
                {new Date(p.purchased_at).toLocaleDateString()}
              </span>
              {p.on_hold && <span className="ml-2.5 text-destructive">· on hold</span>}
            </div>
            <button
              onClick={() => void del(p.id)}
              className="p-1 text-destructive"
              title="Delete pack"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddPackModal({
  firmId,
  onClose,
  onSaved,
}: {
  firmId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sizeStr, setSizeStr] = useState<string>("10");
  const [purchasedAt, setPurchasedAt] = useState<string>(sydneyTodayISO());
  const [pricePerShow, setPricePerShow] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const size = parseInt(sizeStr, 10);

  const save = async () => {
    if (!Number.isFinite(size) || size <= 0) {
      toast.error("Pack size must be greater than 0");
      return;
    }
    setSaving(true);
    const price = parseFloat(pricePerShow);
    const { error } = await supabase.from("firm_packs").insert({
      firm_id: firmId,
      pack_size: size,
      purchased_at: purchasedAt,
      ...(Number.isFinite(price) ? { price_per_show: price } : {}),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Added ${size}-client pack`);
    onSaved();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="firm-portal-ui portal-dialog">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Add client pack</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The firm will see this balance in their portal. A credit is consumed each time a client
          shows up.
        </p>

        <label className="mb-1 block text-sm font-semibold text-foreground">
          Pack size (number of clients)
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {[10, 20, 30, 50].map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={size === n ? "default" : "outline"}
              onClick={() => setSizeStr(String(n))}
            >
              {n}
            </Button>
          ))}
        </div>
        <Input
          type="number"
          min={1}
          value={sizeStr}
          onChange={(e) => setSizeStr(e.target.value.replace(/[^0-9]/g, ""))}
          className="mb-4"
        />

        <label className="mb-1 block text-sm font-semibold text-foreground">Date of purchase</label>
        <Input
          type="date"
          value={purchasedAt}
          onChange={(e) => setPurchasedAt(e.target.value)}
          className="mb-4"
        />

        <label className="mb-1 block text-sm font-semibold text-foreground">
          Price per show (optional)
        </label>
        <Textarea
          value={pricePerShow}
          onChange={(e) => setPricePerShow(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="e.g. 150"
          rows={1}
        />

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Add pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmAdminList.tsx). Re-run the port script to refresh.
import { FirmOffices, useFirmOffices } from "./FirmOffices";
import { useEffect, useId, useState } from "react";
import { Link } from "@/legal/runtime/router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/legal/components/ui/badge";
import { Button } from "@/legal/components/ui/button";
import { Checkbox } from "@/legal/components/ui/checkbox";
import { Input } from "@/legal/components/ui/input";
import { Label } from "@/legal/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/legal/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/legal/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/legal/components/ui/dialog";
import { Search, Plus, Building2, ArrowUpRight, Settings2 } from "lucide-react";
import "./firm-portal.css";
import { Switch } from "@/legal/components/ui/switch";
import { Textarea } from "@/legal/components/ui/textarea";
import { supabase } from "@/legal/integrations/supabase/client";
import { inviteFirmUserFn, listFirmUsersFn, removeFirmUserFn } from "@/legal/lib/firm-portal.functions";
import {
  DAY_NAMES,
  fetchFirms,
  fetchLawyers,
  fetchPacks,
  fetchPackUsage,
  fetchTradingHours,
  packBalanceLabel,
  type Firm,
  type FirmLawyer,
} from "@/legal/lib/partner-firms";

type LawyerDraft = Partial<FirmLawyer> & { name?: string };

function FirmOfficeSummary({ firm }: { firm: Firm }) {
  const offices = useFirmOffices(firm.id);
  const names = (offices.data ?? [])
    .filter((office) => office.is_active && (office.address || office.city))
    .map((office) => office.name);
  return <p className="mt-1 text-sm text-muted-foreground">{
    offices.isPending ? "Loading offices…" : names.join(" · ") ||
      [firm.city, firm.state].filter(Boolean).join(", ") || "Location not added"
  }</p>;
}

/** ["10:00:00","16:00:00"] → "10:00, 16:00" for the editor. */
function formatSlotTimes(times: string[] | null | undefined): string {
  return (times ?? []).map((t) => t.slice(0, 5)).join(", ");
}

/** "10:00, 16:00" → ["10:00","16:00"]; blank → null. Throws on a bad time. */
function parseSlotTimes(text: string): string[] | null {
  const parts = text
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const out: string[] = [];
  for (const part of parts) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(part);
    const h = m ? Number(m[1]) : NaN;
    const mm = m ? Number(m[2]) : NaN;
    if (!m || h > 23 || mm > 59) throw new Error(`"${part}" isn't a time — use HH:MM, e.g. 10:00`);
    out.push(`${String(h).padStart(2, "0")}:${m[2]}`);
  }
  return Array.from(new Set(out)).sort();
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FirmDrawer({ firm, onClose }: { firm: Firm; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Firm>(firm);
  const [lawyerDraft, setLawyerDraft] = useState<LawyerDraft | null>(null);
  const [section, setSection] = useState("details");
  const [customPack, setCustomPack] = useState({ size: "", price: "" });

  useEffect(() => setDraft(firm), [firm]);

  const lawyers = useQuery({
    queryKey: ["firm-lawyers", firm.id],
    queryFn: () => fetchLawyers(firm.id),
  });
  const hours = useQuery({
    queryKey: ["firm-hours", firm.id],
    queryFn: () => fetchTradingHours(firm.id),
  });

  const invalidate = (keys: string[][]) => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
  };

  const saveFirm = useMutation({
    mutationFn: async () => {
      if (!draft.firm_name.trim()) throw new Error("Firm name is required");
      const { error } = await supabase
        .from("firms")
        .update({
          firm_name: draft.firm_name.trim(),
          phone: draft.phone,
          email: draft.email,
          normal_consult_price: Number(draft.normal_consult_price) || 0,
          notes: draft.notes,
        })
        .eq("id", firm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Firm saved");
      invalidate([["firms"]]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLawyer = useMutation({
    mutationFn: async (l: LawyerDraft) => {
      const payload = {
        firm_id: firm.id,
        name: l.name?.trim() ?? "",
        title: l.title ?? null,
        years_experience: l.years_experience ? Number(l.years_experience) : null,
        accredited_specialist: l.accredited_specialist ?? false,
        specialties: l.specialties ?? null,
        what_makes_them_different: l.what_makes_them_different ?? null,
        talking_points: l.talking_points ?? null,
        is_active: l.is_active ?? true,
        hourly_rate: l.hourly_rate ? Number(l.hourly_rate) : null,
      };
      if (!payload.name) throw new Error("Lawyer name is required");
      const { error } = l.id
        ? await supabase.from("firm_lawyers").update(payload).eq("id", l.id)
        : await supabase.from("firm_lawyers").insert(payload);
      if (error) {
        // The column only exists once the hourly_rate migration is published.
        if (error.message.includes("hourly_rate")) {
          throw new Error(
            "Hourly rate can't save yet — publish the latest update in Lovable first.",
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Lawyer saved");
      setLawyerDraft(null);
      invalidate([["firm-lawyers", firm.id]]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveHour = useMutation({
    mutationFn: async (row: {
      id?: string | undefined;
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_open: boolean;
      slot_times?: string[] | null;
    }) => {
      const payload: {
        firm_id: string;
        day_of_week: number;
        open_time: string | null;
        close_time: string | null;
        is_open: boolean;
        slot_times?: string[] | null;
      } = {
        firm_id: firm.id,
        day_of_week: row.day_of_week,
        open_time: row.open_time || null,
        close_time: row.close_time || null,
        is_open: row.is_open,
      };
      // Only touch slot_times when that field was edited, so ordinary hours
      // edits still save on a database that hasn't run the migration yet.
      if (row.slot_times !== undefined) {
        payload.slot_times = row.slot_times && row.slot_times.length > 0 ? row.slot_times : null;
      }
      const { error } = row.id
        ? await supabase.from("firm_trading_hours").update(payload).eq("id", row.id)
        : await supabase.from("firm_trading_hours").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => invalidate([["firm-hours", firm.id]]),
    onError: (e: Error) => toast.error(e.message),
  });

  const addPack = useMutation({
    mutationFn: async (input: { size: number; pricePerShow?: number }) => {
      const size = Math.floor(input.size);
      if (!Number.isFinite(size) || size < 1) throw new Error("Pack size must be at least 1");
      const price = Math.round(input.pricePerShow ?? 1850);
      if (!Number.isFinite(price) || price < 0) throw new Error("Price per show is invalid");
      const { error } = await supabase
        .from("firm_packs")
        .insert({ firm_id: firm.id, pack_size: size, price_per_show: price, status: "active" });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      toast.success(`${input.size}-pack added`);
      setCustomPack({ size: "", price: "" });
      invalidate([["firm-packs"]]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="firm-portal-ui flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-5 py-5 pr-12 text-left">
          <SheetTitle className="break-words">{firm.firm_name}</SheetTitle>
          <SheetDescription>Manage this firm’s details, team and portal access.</SheetDescription>
        </SheetHeader>
        <Tabs value={section} onValueChange={setSection} className="flex min-h-0 flex-1 flex-col">
          <TabsList
            aria-label="Firm settings"
            className="mx-4 my-3 grid h-auto shrink-0 grid-cols-5"
          >
            {[
              ["details", "Details"],
              ["team", "Lawyers"],
              ["hours", "Hours"],
              ["access", "Access"],
              ["packs", "Packs"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value!}
                className="min-w-0 px-1 py-3 text-xs sm:text-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Firm details</h3>
                <Field
                  label="Firm name"
                  value={draft.firm_name}
                  onChange={(v) => setDraft({ ...draft, firm_name: v })}
                />
                <FirmOffices key={firm.id} firmId={firm.id} canEdit />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Phone"
                    value={draft.phone}
                    onChange={(v) => setDraft({ ...draft, phone: v })}
                  />
                  <Field
                    label="Email"
                    value={draft.email}
                    onChange={(v) => setDraft({ ...draft, email: v })}
                  />
                  <Field
                    label="Normal consult price ($)"
                    type="number"
                    value={draft.normal_consult_price}
                    onChange={(v) => setDraft({ ...draft, normal_consult_price: Number(v) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={draft.notes ?? ""}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="team" forceMount className="data-[state=inactive]:hidden">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Lawyers</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLawyerDraft({})}
                  >
                    Add lawyer
                  </Button>
                </div>
                <div className="space-y-2">
                  {(lawyers.data ?? []).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLawyerDraft(l)}
                      className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="font-medium">{l.name}</span>
                      {l.title && <span className="text-muted-foreground"> — {l.title}</span>}
                      {l.hourly_rate ? (
                        <span className="text-muted-foreground"> · ${l.hourly_rate}/hr</span>
                      ) : null}
                      {l.accredited_specialist && (
                        <Badge className="ml-2" variant="secondary">
                          Accredited
                        </Badge>
                      )}
                    </button>
                  ))}
                  {lawyers.isPending && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Loading lawyers…
                    </p>
                  )}
                  {lawyers.isError && (
                    <p role="alert" className="text-sm text-destructive">
                      Could not load lawyers.{" "}
                      <button onClick={() => void lawyers.refetch()} className="underline">
                        Try again
                      </button>
                    </p>
                  )}
                  {lawyers.isSuccess && lawyers.data.length === 0 && (
                    <p className="text-sm text-muted-foreground">No lawyers yet.</p>
                  )}
                </div>

                {lawyerDraft && (
                  <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                    <Field
                      label="Name"
                      value={lawyerDraft.name}
                      onChange={(v) => setLawyerDraft({ ...lawyerDraft, name: v })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Title"
                        value={lawyerDraft.title}
                        onChange={(v) => setLawyerDraft({ ...lawyerDraft, title: v })}
                      />
                      <Field
                        label="Years experience"
                        type="number"
                        value={lawyerDraft.years_experience}
                        onChange={(v) =>
                          setLawyerDraft({ ...lawyerDraft, years_experience: Number(v) })
                        }
                      />
                    </div>
                    <Field
                      label="Hourly rate ($ per hour, plus GST)"
                      type="number"
                      value={lawyerDraft.hourly_rate}
                      onChange={(v) =>
                        setLawyerDraft({ ...lawyerDraft, hourly_rate: v === "" ? null : Number(v) })
                      }
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={lawyerDraft.accredited_specialist ?? false}
                        onCheckedChange={(v) =>
                          setLawyerDraft({ ...lawyerDraft, accredited_specialist: v === true })
                        }
                      />
                      Accredited Family Law Specialist
                    </label>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Specialties</Label>
                      <Textarea
                        value={lawyerDraft.specialties ?? ""}
                        onChange={(e) =>
                          setLawyerDraft({ ...lawyerDraft, specialties: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">What makes them different</Label>
                      <Textarea
                        value={lawyerDraft.what_makes_them_different ?? ""}
                        onChange={(e) =>
                          setLawyerDraft({
                            ...lawyerDraft,
                            what_makes_them_different: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Talking points</Label>
                      <Textarea
                        value={lawyerDraft.talking_points ?? ""}
                        onChange={(e) =>
                          setLawyerDraft({ ...lawyerDraft, talking_points: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saveLawyer.isPending}
                        onClick={() => saveLawyer.mutate(lawyerDraft)}
                      >
                        Save lawyer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setLawyerDraft(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="hours" forceMount className="data-[state=inactive]:hidden">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Weekly booking hours</h3>
                <p className="text-[12px] text-muted-foreground">
                  Open, close, and optional fixed slot times. Leave fixed slots blank for hourly
                  slots between open and close; list start times (e.g. 10:00, 16:00) to offer only
                  those.
                </p>
                <p className="text-xs text-muted-foreground">
                  Changes save automatically. Manage individual days in the firm’s Availability tab.
                </p>
                {hours.isPending ? (
                  <p role="status">Loading hours…</p>
                ) : hours.isError ? (
                  <p role="alert" className="text-sm text-destructive">
                    Could not load hours.{" "}
                    <button onClick={() => void hours.refetch()} className="underline">
                      Try again
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {DAY_NAMES.map((day, index) => {
                      const row = (hours.data ?? []).find((h) => h.day_of_week === index);
                      return (
                        <div
                          key={day}
                          className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
                        >
                          <span className="w-20 text-muted-foreground">{day.slice(0, 3)}</span>
                          <Switch
                            checked={row?.is_open ?? false}
                            aria-label={`${day} open`}
                            onCheckedChange={(checked) =>
                              saveHour.mutate({
                                id: row?.id,
                                day_of_week: index,
                                open_time: row?.open_time ?? "09:00",
                                close_time: row?.close_time ?? "17:00",
                                is_open: checked,
                              })
                            }
                          />
                          <Input
                            type="time"
                            aria-label={`${day} opening time`}
                            className="h-10 w-28"
                            defaultValue={row?.open_time?.slice(0, 5) ?? "09:00"}
                            onBlur={(e) =>
                              saveHour.mutate({
                                id: row?.id,
                                day_of_week: index,
                                open_time: e.target.value,
                                close_time: row?.close_time ?? "17:00",
                                is_open: row?.is_open ?? true,
                              })
                            }
                          />
                          <Input
                            type="time"
                            aria-label={`${day} closing time`}
                            className="h-10 w-28"
                            defaultValue={row?.close_time?.slice(0, 5) ?? "17:00"}
                            onBlur={(e) =>
                              saveHour.mutate({
                                id: row?.id,
                                day_of_week: index,
                                open_time: row?.open_time ?? "09:00",
                                close_time: e.target.value,
                                is_open: row?.is_open ?? true,
                              })
                            }
                          />
                          <Input
                            type="text"
                            className="h-8 w-44"
                            placeholder="Fixed slots, e.g. 10:00, 16:00"
                            aria-label={`${day} fixed slot times`}
                            defaultValue={formatSlotTimes(row?.slot_times)}
                            onBlur={(e) => {
                              let times: string[] | null;
                              try {
                                times = parseSlotTimes(e.target.value);
                              } catch (err) {
                                toast.error((err as Error).message);
                                return;
                              }
                              saveHour.mutate({
                                id: row?.id,
                                day_of_week: index,
                                open_time: row?.open_time ?? "09:00",
                                close_time: row?.close_time ?? "17:00",
                                is_open: row?.is_open ?? true,
                                slot_times: times,
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="access">
              <FirmPortalUsers firmId={firm.id} />
            </TabsContent>

            <TabsContent value="packs">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Add pack capacity</h3>
                <p className="text-sm text-muted-foreground">
                  Adds appointment capacity to this firm. This does not charge the firm or send an
                  invoice.
                </p>
                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
                  <div className="w-24 space-y-1.5">
                    <Label className="text-xs">Custom size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={customPack.size}
                      onChange={(e) => setCustomPack({ ...customPack, size: e.target.value })}
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <Label className="text-xs">Price / show ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="1850"
                      value={customPack.price}
                      onChange={(e) => setCustomPack({ ...customPack, price: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={addPack.isPending}
                    onClick={() =>
                      addPack.mutate({
                        size: Number(customPack.size),
                        ...(customPack.price ? { pricePerShow: Number(customPack.price) } : {}),
                      })
                    }
                  >
                    {addPack.isPending ? "Adding…" : "Add pack"}
                  </Button>
                </div>
              </section>
            </TabsContent>
          </div>
        </Tabs>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {section === "details" && (
            <Button type="button" onClick={() => saveFirm.mutate()} disabled={saveFirm.isPending}>
              {saveFirm.isPending ? "Saving…" : "Save firm details"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FirmPortalUsers({ firmId }: { firmId: string }) {
  const queryClient = useQueryClient();
  const listUsers = useServerFn(listFirmUsersFn);
  const invite = useServerFn(inviteFirmUserFn);
  const remove = useServerFn(removeFirmUserFn);
  const [email, setEmail] = useState("");

  const users = useQuery({
    queryKey: ["firm-portal-users", firmId],
    queryFn: () => listUsers({ data: { firmId } }),
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      const value = email.trim();
      if (!value) throw new Error("Email is required");
      const result = await invite({ data: { firmId, email: value } });
      if (!result.ok) throw new Error(result.error ?? "Invite failed");
      return result;
    },
    onSuccess: () => {
      setEmail("");
      toast.success("Invite sent");
      void queryClient.invalidateQueries({ queryKey: ["firm-portal-users", firmId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      const result = await remove({ data: { userId } });
      if (!result.ok) throw new Error(result.error ?? "Could not remove access");
    },
    onSuccess: () => {
      toast.success("Access removed");
      void queryClient.invalidateQueries({ queryKey: ["firm-portal-users", firmId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Portal access</h3>
        <Button asChild size="sm" variant="outline">
          <Link to="/firm-portal" search={{ firmId }}>
            View portal
          </Link>
        </Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Invite each person using their own email address. They’ll receive a secure link to set a
        password, then sign in to this firm’s appointments, availability and pack credit.
      </p>
      <p className="rounded-lg bg-muted p-3 text-sm">
        Returning users sign in at{" "}
        <a
          className="font-medium text-primary underline"
          href="/firm-portal"
          target="_blank"
          rel="noreferrer"
        >
          the firm portal
        </a>
        . To resend an invitation, enter the same email below.
      </p>
      <div className="space-y-2">
        {(users.data ?? []).map((u) => (
          <div key={u.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{u.email ?? u.id}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={removeUser.isPending}
              onClick={() => {
                if (window.confirm(`Remove portal access for ${u.email ?? "this user"}?`))
                  removeUser.mutate(u.id);
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        {users.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading access…
          </p>
        )}
        {users.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load portal access.{" "}
            <button onClick={() => void users.refetch()} className="underline">
              Try again
            </button>
          </p>
        )}
        {users.isSuccess && users.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No portal logins yet.</p>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Invite by email</Label>
          <Input
            type="email"
            aria-label="Invite by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="reception@firm.com.au"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => inviteUser.mutate()}
          disabled={inviteUser.isPending || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
        >
          {inviteUser.isPending ? "Sending…" : "Send invitation"}
        </Button>
      </div>
    </section>
  );
}

export function FirmAdminList({ onOpenPortal }: { onOpenPortal: (firmId: string) => void }) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newFirmName, setNewFirmName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(0);

  const firms = useQuery({ queryKey: ["firms"], queryFn: fetchFirms });
  const packs = useQuery({ queryKey: ["firm-packs"], queryFn: fetchPacks });
  const packUsage = useQuery({ queryKey: ["firm-pack-usage"], queryFn: fetchPackUsage });

  const createFirm = useMutation({
    mutationFn: async () => {
      const name = newFirmName.trim();
      if (!name) throw new Error("Firm name is required");
      const { error } = await supabase.from("firms").insert({ firm_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewFirmName("");
      setShowCreate(false);
      toast.success("Firm created");
      void queryClient.invalidateQueries({ queryKey: ["firms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("firms").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["firms"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const openFirm = (firms.data ?? []).find((f) => f.id === openId) ?? null;

  const allFirms = firms.data ?? [];
  const filtered = allFirms
    .filter(
      (firm) =>
        (status === "all" || firm.is_active === (status === "active")) &&
        `${firm.firm_name} ${firm.city ?? ""} ${firm.state ?? ""} ${firm.email ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => a.firm_name.localeCompare(b.firm_name));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * 12, (currentPage + 1) * 12);

  return (
    <main className="firm-portal-ui mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Firm management
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Partner firms</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Find a firm, manage its details or open its appointment portal.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add firm
        </Button>
      </div>
      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
          />
          <Input
            aria-label="Search firms"
            placeholder="Search firms, location or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-10 pl-9"
          />
        </div>
        <div className="flex shrink-0 rounded-lg bg-muted p-1" aria-label="Firm status">
          {["active", "inactive", "all"].map((value) => (
            <button
              key={value}
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(0);
              }}
              className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${status === value ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      {firms.isPending ? (
        <div
          role="status"
          className="rounded-xl border bg-card p-10 text-center text-muted-foreground"
        >
          Loading firms…
        </div>
      ) : firms.isError ? (
        <div role="alert" className="rounded-xl border bg-card p-8">
          <p className="mb-4 text-destructive">Could not load firms. Please try again.</p>
          <Button variant="outline" onClick={() => void firms.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" role="status">
            {filtered.length} {filtered.length === 1 ? "firm" : "firms"}
            {search.trim() ? ` matching “${search.trim()}”` : ""}
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((firm) => {
              const capacity = (packs.data ?? [])
                .filter((p) => p.firm_id === firm.id && p.status === "active")
                .reduce((sum, p) => sum + p.pack_size, 0);
              const used = packUsage.data?.[firm.id] ?? 0;
              return (
                <article
                  key={firm.id}
                  className="flex min-w-0 flex-col rounded-xl border bg-card p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <label className="flex min-h-10 items-center gap-2 text-xs text-muted-foreground">
                      {firm.is_active ? "Active" : "Inactive"}
                      <Switch
                        checked={firm.is_active}
                        disabled={toggleActive.isPending}
                        aria-label={`${firm.firm_name} active`}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: firm.id, is_active: checked })
                        }
                      />
                    </label>
                  </div>
                  <h2 className="break-words text-base font-semibold">{firm.firm_name}</h2>
                  <FirmOfficeSummary firm={firm} />
                  <div className="my-4">
                    <Badge variant="secondary">
                      {packs.isError || packUsage.isError
                        ? "Balance unavailable"
                        : packs.isPending || packUsage.isPending
                          ? "Loading balance…"
                          : packBalanceLabel(capacity, used)}
                    </Badge>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setOpenId(firm.id)}
                      aria-label={`Manage ${firm.firm_name}`}
                    >
                      <Settings2 className="mr-1.5 h-4 w-4" />
                      Manage
                    </Button>
                    <Button
                      onClick={() => onOpenPortal(firm.id)}
                      aria-label={`Open portal for ${firm.firm_name}`}
                    >
                      Open portal
                      <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-xl border bg-card p-10 text-center">
              <h2 className="font-semibold">No firms found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another search or choose All to see every firm.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setPage(0);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
          {pageCount > 1 && (
            <nav aria-label="Firm pages" className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                disabled={currentPage + 1 === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
      {openFirm && <FirmDrawer key={openFirm.id} firm={openFirm} onClose={() => setOpenId(null)} />}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="firm-portal-ui portal-dialog">
          <DialogHeader>
            <DialogTitle>Add a partner firm</DialogTitle>
            <DialogDescription>
              Start with the firm’s name. You can add its team and hours next.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFirm.mutate();
            }}
            className="space-y-4"
          >
            <Field label="Firm name" value={newFirmName} onChange={setNewFirmName} />
            <Button className="w-full" disabled={createFirm.isPending || !newFirmName.trim()}>
              {createFirm.isPending ? "Adding…" : "Add firm"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Ported from the Legal app (family-law-floater/src/components/settings/staff-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useRouter } from "@/legal/runtime/router";
import { supabase } from "@/legal/integrations/supabase/client";
import { defaultPortalPages, type PortalPage } from "@/legal/lib/portal-pages";
import { TabAccessPicker } from "./tab-access-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/legal/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/legal/components/ui/badge";
import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Input } from "@/legal/components/ui/input";
import { Label } from "@/legal/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/legal/components/ui/table";
import { fetchColdCallingSettings } from "@/legal/lib/cold-calling/client";
import {
  inviteStaffFn,
  setStaffTabAccessFn,
  renameStaffFn,
  resendStaffInviteFn,
  setStaffActiveFn,
} from "@/legal/lib/staff-admin.functions";

/** Invite appointment setters and manage who can sign in. Admin only. */
export function StaffCard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const staff = useQuery({
    queryKey: ["staff-tab-access"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_staff_portal_access");
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const settings = useQuery({
    queryKey: ["cold-calling-settings"],
    queryFn: fetchColdCallingSettings,
  });
  const setterIds = new Set(settings.data?.setter_user_ids ?? []);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "setter" as "setter" | "rep" | "admin",
    pages: defaultPortalPages("setter"),
  });
  const inviteFn = useServerFn(inviteStaffFn);
  const resendFn = useServerFn(resendStaffInviteFn);
  const activeFn = useServerFn(setStaffActiveFn);
  const renameFn = useServerFn(renameStaffFn);
  const [renaming, setRenaming] = useState<{ repId: string; name: string } | null>(null);
  const [editing, setEditing] = useState<{
    repId: string;
    name: string;
    pages: PortalPage[];
  } | null>(null);
  const saveTabsFn = useServerFn(setStaffTabAccessFn);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff-directory"] });
    void queryClient.invalidateQueries({ queryKey: ["staff-tab-access"] });
  };
  const saveTabs = useMutation({
    mutationFn: (input: { repId: string; pages: PortalPage[] }) => saveTabsFn({ data: input }),
    onSuccess: () => {
      toast.success("Tab access saved. Applied on their next sign-in or page change.");
      setEditing(null);
      refresh();
      void router.invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invite = useMutation({
    mutationFn: () => inviteFn({ data: draft }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error ?? "Invite failed", { duration: 12000 });
        return;
      }
      toast.success(`Invite sent to ${draft.email}`);
      setDraft({ name: "", email: "", role: "setter", pages: defaultPortalPages("setter") });
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["cold-calling-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resend = useMutation({
    mutationFn: (email: string) => resendFn({ data: { email } }),
    onSuccess: (r, email) =>
      r.ok
        ? toast.success(`Password link re-sent to ${email}`)
        : toast.error(r.error ?? "Could not send"),
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (input: { repId: string; active: boolean }) => activeFn({ data: input }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: (input: { repId: string; name: string }) => renameFn({ data: input }),
    onSuccess: (_r, input) => {
      toast.success(`Renamed to ${input.name}`);
      setRenaming(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" aria-hidden /> Staff &amp; appointment setters
        </CardTitle>
        <CardDescription>
          Choose the tabs each person can see, then invite them by email. Edit their access any
          time. Saved changes apply at sign-in, on page changes, and within 30 seconds in an open
          portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_140px_auto]">
          <div>
            <Label htmlFor="staff-name">Name</Label>
            <Input
              id="staff-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Jess Smith"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="jess@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="staff-role">Role</Label>
            <Select
              value={draft.role}
              onValueChange={(v) => {
                const role = v as "setter" | "rep" | "admin";
                setDraft({ ...draft, role, pages: defaultPortalPages(role) });
              }}
            >
              <SelectTrigger id="staff-role" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="setter">Appointment setter</SelectItem>
                <SelectItem value="rep">Sales rep</SelectItem>
                <SelectItem value="admin">Admin (everything)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => invite.mutate()}
              disabled={invite.isPending || !draft.name.trim() || !draft.email.includes("@")}
            >
              {invite.isPending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>
        {draft.role === "admin" ? (
          <p className="text-sm text-muted-foreground">
            Admins have all tabs and can manage staff access.
          </p>
        ) : (
          <div className="rounded-lg border p-4">
            <TabAccessPicker
              value={draft.pages}
              onChange={(pages) => setDraft({ ...draft, pages })}
              disabled={invite.isPending}
            />
          </div>
        )}
        {staff.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading staff…
          </p>
        )}
        {staff.error && (
          <p role="alert" className="text-sm text-destructive">
            Could not load staff access: {staff.error.message}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(staff.data ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {renaming?.repId === s.id ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (renaming.name.trim()) rename.mutate(renaming);
                      }}
                    >
                      <Input
                        autoFocus
                        aria-label="Full name"
                        className="h-8 w-48"
                        value={renaming.name}
                        onChange={(e) => setRenaming({ repId: s.id, name: e.target.value })}
                      />
                      <Button size="sm" type="submit" disabled={rename.isPending}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => setRenaming(null)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    (s.name ?? "—")
                  )}
                </TableCell>
                <TableCell>{s.email ?? "—"}</TableCell>
                <TableCell>
                  {s.role === "admin"
                    ? "Admin"
                    : s.user_id && setterIds.has(s.user_id)
                      ? "Appointment setter"
                      : "Sales rep"}
                </TableCell>
                <TableCell>
                  {s.is_active ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {s.role === "admin" ? (
                      <Badge variant="secondary">All tabs</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditing({
                            repId: s.id,
                            name: s.name || s.email || "Staff member",
                            pages: s.pages as PortalPage[],
                          })
                        }
                      >
                        Edit tab access ({s.pages.length})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRenaming({ repId: s.id, name: s.name ?? "" })}
                    >
                      Rename
                    </Button>
                    {s.email ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resend.mutate(s.email!)}
                        disabled={resend.isPending}
                      >
                        Re-send password link
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant={s.is_active ? "ghost" : "default"}
                      onClick={() => toggle.mutate({ repId: s.id, active: !s.is_active })}
                      disabled={toggle.isPending}
                    >
                      {s.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open && !saveTabs.isPending) setEditing(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tab access — {editing?.name}</DialogTitle>
              <DialogDescription>
                Tick the tabs this person can open. Unticked tabs disappear from their menu and
                direct links are blocked.
              </DialogDescription>
            </DialogHeader>
            {editing && (
              <TabAccessPicker
                value={editing.pages}
                onChange={(pages) => setEditing({ ...editing, pages })}
                disabled={saveTabs.isPending}
              />
            )}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={saveTabs.isPending}
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={saveTabs.isPending || !editing}
                onClick={() => editing && saveTabs.mutate(editing)}
              >
                {saveTabs.isPending ? "Saving…" : "Save tab access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

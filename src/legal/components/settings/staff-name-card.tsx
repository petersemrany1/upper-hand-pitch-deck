// Ported from the Legal app (family-law-floater/src/components/settings/staff-name-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { fetchCurrentStaff, updateStaffName } from "@/legal/lib/client-leads";

export function StaffNameCard() {
  const queryClient = useQueryClient();
  const staffQuery = useQuery({ queryKey: ["current-staff"], queryFn: fetchCurrentStaff });
  const staff = staffQuery.data;
  const [name, setName] = useState(staff?.name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!staff) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a name.");
      return;
    }
    setSaving(true);
    try {
      await updateStaffName(staff.id, trimmed);
      await queryClient.invalidateQueries({ queryKey: ["current-staff"] });
      toast.success("Name updated.");
    } catch (e) {
      toast.error((e as Error).message || "Could not update name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" /> Staff Name
        </CardTitle>
        <CardDescription>
          This name appears in the sales call script when you introduce yourself to leads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            className="max-w-sm"
            disabled={!staff || staffQuery.isLoading}
          />
          <Button
            onClick={handleSave}
            disabled={saving || !staff || name.trim() === (staff?.name ?? "")}
            className="w-fit"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        {!staff && !staffQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">No staff record found for your account.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

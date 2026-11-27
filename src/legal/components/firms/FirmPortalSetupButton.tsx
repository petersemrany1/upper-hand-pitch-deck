// Ported from the Legal app (family-law-floater/src/components/firms/FirmPortalSetupButton.tsx). Re-run the port script to refresh.
import { useRef } from "react";
import { Link } from "@/legal/runtime/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchFirmPortalLink, setUpFirmPortal } from "@/legal/lib/firm-portal-setup";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#ddd9fb] bg-[#f0effc] px-3 py-2 text-xs font-semibold text-[#4338ca] hover:bg-[#e5e2fc] disabled:cursor-not-allowed disabled:opacity-60";

export function FirmPortalSetupButton({
  applicationId,
  contactSaving = false,
}: {
  applicationId: string;
  contactSaving?: boolean;
}) {
  const client = useQueryClient();
  const busy = useRef(false);
  const queryKey = ["firm-portal-link", applicationId];
  const link = useQuery({
    queryKey,
    queryFn: () => fetchFirmPortalLink(applicationId),
  });
  const setup = useMutation({
    mutationFn: () => setUpFirmPortal(applicationId),
    onSuccess: (result) => {
      client.setQueryData(queryKey, result.firm_id);
      for (const key of [
        ["firms"],
        ["staff-portal-firms"],
        ["firm-application-notes", applicationId],
        ["firm-note-summaries"],
      ]) {
        void client.invalidateQueries({ queryKey: key });
      }
      toast.success(result.created ? "Firm portal set up" : "Linked to existing firm portal", {
        description:
          "The saved contact details have been carried across. You can open the portal now.",
      });
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  if (link.data) {
    return (
      <Link to="/firm-portal" search={{ firmId: link.data }} className={buttonClass}>
        <Building2 size={15} /> Open firm portal <ArrowUpRight size={14} />
      </Link>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className={buttonClass}
        disabled={setup.isPending || contactSaving || link.isPending}
        onClick={() => {
          if (busy.current) return;
          busy.current = true;
          setup.mutate();
        }}
      >
        {setup.isPending ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
        {setup.isPending ? "Setting up…" : "Set up in firm portal"}
      </button>
      {contactSaving && (
        <span className="text-xs text-muted-foreground">Waiting for contact details to save…</span>
      )}
      {setup.error && (
        <p role="alert" className="max-w-sm text-xs text-destructive">
          {setup.error.message}
        </p>
      )}
    </div>
  );
}

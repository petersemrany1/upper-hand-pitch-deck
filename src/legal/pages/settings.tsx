// Ported from the Legal app (family-law-floater/src/routes/_authenticated/settings.tsx). Re-run the port script to refresh.
import { Link } from "@/legal/runtime/router";
import { useQuery } from "@tanstack/react-query";

import { PhoneNumbersCard } from "@/legal/components/settings/phone-numbers-card";
import { PausedCitiesCard } from "@/legal/components/settings/paused-cities-card";
import { FocusCitiesCard } from "@/legal/components/settings/focus-cities-card";
import { LinkingEducationCard } from "@/legal/components/settings/linking-education-card";
import { StaffNameCard } from "@/legal/components/settings/staff-name-card";
import { ExportTranscriptsCard } from "@/legal/components/settings/export-transcripts-card";
import { ColdCallingCard } from "@/legal/components/settings/cold-calling-card";
import { StaffCard } from "@/legal/components/settings/staff-card";
import { ExampleCallsCard } from "@/legal/components/settings/example-calls-card";
import { PracticeReviewCard } from "@/legal/components/settings/practice-review-card";
import { TrainingCard } from "@/legal/components/settings/training-card";
import { TrainingVideosCard } from "@/legal/components/settings/training-videos-card";
import { fetchCurrentStaff } from "@/legal/lib/client-leads";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { SettingsPage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Settings — Legal Group Portal" },
      {
        name: "description",
        content: "Manage the Legal Group portal: outbound number pool and account settings.",
      },
      { property: "og:title", content: "Settings — Legal Group Portal" },
      {
        property: "og:description",
        content: "Manage the Legal Group portal: outbound number pool and account settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const staff = useQuery({ queryKey: ["current-staff"], queryFn: fetchCurrentStaff });
  const isAdmin = staff.data?.role === "admin";

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Portal configuration and telephony.</p>
      </header>

      {staff.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isAdmin ? (
        <>
          <Link to="/ad-briefing" className="block rounded-lg border p-4 font-medium text-primary">
            Your daily ad briefing →
          </Link>
          <ExportTranscriptsCard />
          <StaffNameCard />
          <StaffCard />
          <TrainingCard />
          <PracticeReviewCard />
          <ExampleCallsCard />
          <TrainingVideosCard />
          <PhoneNumbersCard />
          <ColdCallingCard />
          <FocusCitiesCard />
          <PausedCitiesCard />
          <LinkingEducationCard />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          There are no settings available for your account.
        </p>
      )}
    </div>
  );
}

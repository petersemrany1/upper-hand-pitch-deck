import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/letter-campaign")({
  head: () => ({
    meta: [
      { title: "Letter Campaign" },
      { name: "description", content: "Track physical letters sent to hair transplant clinics." },
    ],
  }),
});

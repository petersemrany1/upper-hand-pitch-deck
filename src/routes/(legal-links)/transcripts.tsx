import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's /transcripts address opens Recordings & Transcripts on its Legal side.
export const Route = createFileRoute("/(legal-links)/transcripts")({
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/my-recordings" as never, search: { ...(location.search as object), biz: "legal" } as never });
  },
});

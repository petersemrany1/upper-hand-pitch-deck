import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FRAMEWORK_STAGES } from "./_dashboard.training.sales-framework.index";

export const Route = createFileRoute("/_dashboard/training/sales-framework/$stage")({
  component: SalesFrameworkStagePage,
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
      },
    ],
  }),
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

function SalesFrameworkStagePage() {
  const { stage } = Route.useParams();
  const idx = FRAMEWORK_STAGES.findIndex((s) => s.slug === stage);
  if (idx === -1) throw notFound();
  const current = FRAMEWORK_STAGES[idx];
  const prev = idx > 0 ? FRAMEWORK_STAGES[idx - 1] : null;
  const next = idx < FRAMEWORK_STAGES.length - 1 ? FRAMEWORK_STAGES[idx + 1] : null;

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 880, margin: "0 auto" }}>
        <Link
          to="/training/sales-framework"
          style={{ fontSize: 13, color: "#6b6b6b", textDecoration: "none", marginBottom: 16, display: "inline-block" }}
        >
          ‹ Back to Sales Framework
        </Link>
        <div style={{ fontSize: 12, color: "#9a9a9a", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
          Module {idx + 1} of {FRAMEWORK_STAGES.length}
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 20, letterSpacing: "-0.01em" }}>
          {current.title}
        </h1>

        {/* Video placeholder */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ebebeb",
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              aspectRatio: "16 / 9",
              background: "#f3f3f3",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              border: "1px dashed #d4d4d4",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "#fff1ee",
                color: "#f4522d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              ▶
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Video coming soon</div>
            <div style={{ fontSize: 12, color: "#6b6b6b" }}>Training video for "{current.title}" will appear here.</div>
          </div>
        </div>

        {/* Notes */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ebebeb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 28,
            fontSize: 13,
            color: "#6b6b6b",
            lineHeight: 1.6,
          }}
        >
          Notes, talking points and resources for this stage will appear here once the video is uploaded.
        </div>

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          {prev ? (
            <Link
              to="/training/sales-framework/$stage"
              params={{ stage: prev.slug }}
              style={{
                textDecoration: "none",
                padding: "10px 16px",
                border: "1px solid #ebebeb",
                borderRadius: 8,
                background: "#fff",
                fontSize: 13,
                color: "#111",
                fontWeight: 500,
              }}
            >
              ‹ {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to="/training/sales-framework/$stage"
              params={{ stage: next.slug }}
              style={{
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: 8,
                background: "#f4522d",
                fontSize: 13,
                color: "#fff",
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              {next.title} ›
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

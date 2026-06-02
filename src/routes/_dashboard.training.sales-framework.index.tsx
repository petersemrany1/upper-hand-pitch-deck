import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/sales-framework/")({
  component: SalesFrameworkPage,
  head: () => ({
    meta: [{ title: "Sales Framework" }],
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

export const FRAMEWORK_STAGES: { slug: string; title: string }[] = [
  { slug: "introduction", title: "Introduction" },
  { slug: "the-opening", title: "The Opening" },
  { slug: "discovery", title: "Discovery" },
  { slug: "amplification", title: "Amplification" },
  { slug: "education", title: "Education" },
  { slug: "audiobook-moment", title: "Audiobook Moment" },
  { slug: "commitment-booking", title: "Commitment & Booking" },
  { slug: "end-of-call-objections", title: "End of call Objections" },
  { slug: "closing-order-takers", title: "Closing - Order Takers" },
];

function SalesFrameworkPage() {
  const completed = 0;
  const total = FRAMEWORK_STAGES.length;

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 880, margin: "0 auto" }}>
        <Link
          to="/training"
          style={{ fontSize: 13, color: "#6b6b6b", textDecoration: "none", marginBottom: 16, display: "inline-block" }}
        >
          ‹ Back to Training
        </Link>
        <h1 style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.01em" }}>
          Sales Framework
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 16 }}>
          {completed} of {total} modules complete
        </p>
        <div style={{ height: 4, background: "#ebebeb", borderRadius: 999, marginBottom: 28, overflow: "hidden" }}>
          <div style={{ width: `${(completed / total) * 100}%`, height: "100%", background: "#f4522d" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FRAMEWORK_STAGES.map((m, i) => {
            const isCurrent = i === 0;
            return (
              <Link
                key={m.slug}
                to="/training/sales-framework/$stage"
                params={{ stage: m.slug }}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 20px",
                    border: `1px solid ${isCurrent ? "#111" : "#ebebeb"}`,
                    borderRadius: 10,
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.05)";
                    if (!isCurrent) e.currentTarget.style.borderColor = "#f4522d";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    if (!isCurrent) e.currentTarget.style.borderColor = "#ebebeb";
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: isCurrent ? "#111" : "#f3f3f3",
                      color: isCurrent ? "#fff" : "#9a9a9a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                      fontFamily: FONT,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{m.title}</span>
                  </div>
                  <span style={{ color: "#c4c4c4", fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

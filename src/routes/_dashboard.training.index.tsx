import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/")({
  component: TrainingPage,
});

const modules = [
  {
    title: "Product Knowledge",
    url: "/training/product-knowledge",
    desc: "Learn everything about the product, services, pricing, and clinic partnerships.",
  },
  {
    title: "Understanding Who You Are Talking To",
    url: "/training/audience",
    desc: "Buyer personas, motivations, objections and how to identify lead types fast.",
  },
  {
    title: "Sales Call Example",
    url: "/training/sales-call-example",
    desc: "Listen to model sales calls and study the structure step by step.",
  },
  {
    title: "AI Training",
    url: "/training/ai",
    desc: "How to use the in-portal AI tools (coach, summaries, lead intel) effectively.",
  },
  {
    title: "Platform Training",
    url: "/training/platform",
    desc: "Tour of the portal: leads, dialler, callbacks, SMS, bookings and reporting.",
  },
];

function TrainingPage() {
  const completed = 0;
  const total = modules.length;
  const currentIndex = 0;

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.01em" }}>
        Your Training Journey
      </h1>
      <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 16 }}>
        {completed} of {total} stages complete
      </p>
      <div style={{ height: 4, background: "#ebebeb", borderRadius: 999, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ width: `${(completed / total) * 100}%`, height: "100%", background: "#f4522d" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {modules.map((m, i) => {
          const isCurrent = i === currentIndex;
          return (
            <Link key={m.url} to={m.url} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 20px",
                  border: `1px solid ${isCurrent ? "#111" : "#ebebeb"}`,
                  borderRadius: 12,
                  background: "#fff",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
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
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{m.title}</span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#444",
                          background: "#ececec",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
                </div>
                <span style={{ color: "#c4c4c4", fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

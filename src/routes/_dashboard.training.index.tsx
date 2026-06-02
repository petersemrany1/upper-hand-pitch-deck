import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, UserSearch, PhoneCall, Brain, Monitor } from "lucide-react";

export const Route = createFileRoute("/_dashboard/training/")({
  component: TrainingPage,
});

const modules = [
  {
    title: "Product Knowledge",
    url: "/training/product-knowledge",
    icon: BookOpen,
    desc: "Learn everything about the product, services, pricing, and clinic partnerships.",
  },
  {
    title: "Understanding Who You Are Talking To",
    url: "/training/audience",
    icon: UserSearch,
    desc: "Buyer personas, motivations, objections and how to identify lead types fast.",
  },
  {
    title: "Sales Call Example",
    url: "/training/sales-call-example",
    icon: PhoneCall,
    desc: "Listen to model sales calls and study the structure step by step.",
  },
  {
    title: "AI Training",
    url: "/training/ai",
    icon: Brain,
    desc: "How to use the in-portal AI tools (coach, summaries, lead intel) effectively.",
  },
  {
    title: "Platform Training",
    url: "/training/platform",
    icon: Monitor,
    desc: "Tour of the portal: leads, dialler, callbacks, SMS, bookings and reporting.",
  },
];

function TrainingPage() {
  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111", marginBottom: 8 }}>
        Training
      </h1>
      <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 28 }}>
        Work through each module to master the platform and sales process.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {modules.map((m) => (
          <Link
            key={m.url}
            to={m.url}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                padding: 20,
                border: "1px solid #ebebeb",
                borderRadius: 8,
                background: "#ffffff",
                cursor: "pointer",
                transition: "box-shadow 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                e.currentTarget.style.borderColor = "#f4522d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "#ebebeb";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <m.icon style={{ width: 20, height: 20, color: "#f4522d" }} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  {m.title}
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b6b6b",
                  lineHeight: 1.5,
                }}
              >
                {m.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_dashboard/clinic-leads")({
  component: ClinicLeadsPage,
  head: () => ({
    meta: [
      { title: "Clinic Leads — Hair Transplant Group" },
      {
        name: "description",
        content:
          "Inbound B2B clinic prospects captured from partner webhooks.",
      },
      { property: "og:title", content: "Clinic Leads" },
      {
        property: "og:description",
        content: "Inbound B2B clinic prospects captured from partner webhooks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ClinicLead = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  clinic_name: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  status: string | null;
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function ClinicLeadsPage() {
  const { role, ready } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClinicLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (role !== "admin") {
      navigate({ to: "/" });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clinic_leads")
        .select(
          "id, created_at, first_name, last_name, email, phone, clinic_name, city, state, source, status"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      setRows((data as ClinicLead[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, role, navigate]);

  if (!ready) return null;
  if (role !== "admin") return null;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>
          Clinic Leads
        </h1>
        <p style={{ fontSize: 13, color: "#6b6b6b", marginTop: 4 }}>
          Inbound B2B prospects from partner webhook. Newest first.
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ebebeb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#fafafa" }}>
            <tr style={{ textAlign: "left", color: "#6b6b6b" }}>
              <th style={th}>Received</th>
              <th style={th}>Name</th>
              <th style={th}>Clinic</th>
              <th style={th}>Phone</th>
              <th style={th}>Email</th>
              <th style={th}>City / State</th>
              <th style={th}>Source</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6b6b6b" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6b6b6b" }}>
                  No clinic leads yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
              const loc = [r.city, r.state].filter(Boolean).join(", ") || "—";
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                  <td style={td}>{fmtDate(r.created_at)}</td>
                  <td style={td}>{name}</td>
                  <td style={td}>{r.clinic_name || "—"}</td>
                  <td style={td}>{r.phone || "—"}</td>
                  <td style={td}>{r.email || "—"}</td>
                  <td style={td}>{loc}</td>
                  <td style={td}>{r.source || "—"}</td>
                  <td style={td}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#ebebeb",
                        color: "#111",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {r.status || "new"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 500, fontSize: 12 };
const td: React.CSSProperties = { padding: "10px 12px", color: "#111", verticalAlign: "top" };

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Mail, Phone as PhoneIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/leads")({
  component: LeadsPage,
});

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  funding_preference: string | null;
  ad_name: string | null;
  ad_set_name: string | null;
  campaign_name: string | null;
  creative_time: string | null;
  created_at: string;
};

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meta_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setRows((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel("meta-leads-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "meta_leads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.first_name ?? "").toLowerCase().includes(q) ||
      (r.last_name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      (r.campaign_name ?? "").toLowerCase().includes(q) ||
      (r.ad_name ?? "").toLowerCase().includes(q) ||
      (r.ad_set_name ?? "").toLowerCase().includes(q) ||
      (r.funding_preference ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    setBusyId(id);
    await supabase.from("meta_leads").delete().eq("id", id);
    setConfirmDeleteId(null);
    setBusyId(null);
    await load();
  };

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#111111]">Meta Leads</h1>
          <p className="text-sm text-[#999] mt-1">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} leads`}
          </p>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, campaign…"
            className="w-full pl-10 pr-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb]/10 text-sm text-[#111111] placeholder:text-[#666] focus:outline-none focus:border-[#f4522d]"
          />
        </div>

        <div className="rounded-lg border border-[#ebebeb]/10 overflow-hidden" style={{ background: "#f9f9f9" }}>
          {loading ? (
            <div className="p-12 text-center text-[#999] text-sm">Loading leads…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#999] text-sm">
              {rows.length === 0 ? "No leads yet. Once Make.com posts to your webhook, they'll appear here." : "No leads match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebebeb]/10 text-xs uppercase tracking-wider text-[#999]">
                    <th className="text-left px-4 py-3 font-medium">Received</th>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Funding</th>
                    <th className="text-left px-4 py-3 font-medium">Campaign / Ad Set / Ad</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const fullName = [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={r.id} className="border-b border-[#ebebeb]/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-[#999] whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-[#111111] font-medium whitespace-nowrap">{fullName}</td>
                        <td className="px-4 py-3 text-[#666]">
                          <div className="flex flex-col gap-1">
                            {r.email && (
                              <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-[#f4522d]">
                                <Mail className="h-3 w-3" />{r.email}
                              </a>
                            )}
                            {r.phone && (
                              <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#f4522d]">
                                <PhoneIcon className="h-3 w-3" />{r.phone}
                              </a>
                            )}
                            {!r.email && !r.phone && <span className="text-[#666]">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r.funding_preference ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[#f4522d]/15 text-[#7ba3ee] border border-[#f4522d]/30">
                              {r.funding_preference}
                            </span>
                          ) : <span className="text-[#666]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[#999] text-xs">
                          <div className="flex flex-col gap-0.5 max-w-xs">
                            <div className="text-[#666]">{r.campaign_name || "—"}</div>
                            <div>{r.ad_set_name || "—"}</div>
                            <div className="text-[#999]">{r.ad_name || "—"}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {confirmDeleteId === r.id ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(r.id)}
                                disabled={busyId === r.id}
                                className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded text-xs bg-[#ffffff]/5 text-[#999] hover:bg-[#ffffff]/10"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(r.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-[#999] hover:text-red-400 hover:bg-red-500/10"
                              title="Delete lead"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

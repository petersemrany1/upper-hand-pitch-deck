import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Plus, Phone, Mail, Building2, X, ChevronDown, ChevronRight,
  PhoneCall, Loader2, ExternalLink, Calendar, MessageSquare,
  Upload,
} from "lucide-react";


export const Route = createFileRoute("/_dashboard/clinics")({
  component: ClinicsPage,
  head: () => ({
    meta: [
      { title: "Clinics CRM" },
      { name: "description", content: "Manage hair transplant clinic leads." },
    ],
  }),
});

type Clinic = {
  id: string;
  clinic_name: string;
  state: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  owner_name: string | null;
  priority: string;
  status: string;
  next_follow_up: string | null;
  notes: string | null;
  created_at: string;
};

type ClinicContact = {
  id: string;
  clinic_id: string;
  contact_type: string;
  outcome: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  duration: string | null;
  created_at: string;
};

const STATUSES = ["New", "Contacted", "Interested", "Negotiating", "Won", "Lost", "Not Interested"];
const STATES_ABBR: Record<string, string> = {
  "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD",
  "Western Australia": "WA", "South Australia": "SA", "Tasmania": "TAS",
  "ACT": "ACT", "Northern Territory": "NT",
};
const STATES = ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "ACT", "Northern Territory"];
const CONTACT_TYPES = ["Call", "Email", "Loom", "Meeting"];
const OUTCOMES = ["No Answer", "Left Voicemail", "Spoke", "Interested", "Not Interested", "Follow Up", "Won"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  New: { bg: "#27272a", text: "#a1a1aa" },
  Contacted: { bg: "#1e3a5f", text: "#60a5fa" },
  Interested: { bg: "#14532d", text: "#4ade80" },
  Negotiating: { bg: "#451a03", text: "#fbbf24" },
  Won: { bg: "#064e3b", text: "#34d399" },
  Lost: { bg: "#450a0a", text: "#f87171" },
  "Not Interested": { bg: "#1e293b", text: "#94a3b8" },
};


type SavedPhone = { name: string; phone: string };
const DEFAULT_PHONES: SavedPhone[] = [{ name: "Peter Semrany", phone: "0418214953" }];
function getStoredPhones(): SavedPhone[] {
  try {
    const stored = localStorage.getItem("saved_caller_phones");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_PHONES;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});

  // Detail panel
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [contacts, setContacts] = useState<ClinicContact[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editFollowUp, setEditFollowUp] = useState("");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Log activity modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState("Call");
  const [logOutcome, setLogOutcome] = useState("Spoke");
  const [logNotes, setLogNotes] = useState("");
  const [logNextAction, setLogNextAction] = useState("");
  const [logNextDate, setLogNextDate] = useState("");
  const [logDuration, setLogDuration] = useState("");

  // Add clinic modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  // Bulk CSV upload
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call
  const [callingId, setCallingId] = useState<string | null>(null);
  const savedPhones = getStoredPhones();

  // Last contact cache
  const [lastContacts, setLastContacts] = useState<Record<string, string>>({});

  const loadClinics = useCallback(async () => {
    const { data } = await supabase.from("clinics").select("*").order("created_at", { ascending: false });
    if (data) setClinics(data as Clinic[]);
    setLoading(false);
  }, []);

  const loadLastContacts = useCallback(async () => {
    const { data } = await supabase.from("clinic_contacts").select("clinic_id, created_at").order("created_at", { ascending: false });
    if (data) {
      const map: Record<string, string> = {};
      for (const d of data) {
        if (!map[d.clinic_id]) map[d.clinic_id] = d.created_at;
      }
      setLastContacts(map);
    }
  }, []);

  useEffect(() => { loadClinics(); loadLastContacts(); }, [loadClinics, loadLastContacts]);

  const loadContacts = async (clinicId: string) => {
    const { data } = await supabase.from("clinic_contacts").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false });
    if (data) setContacts(data as ClinicContact[]);
  };

  const openDetail = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setEditNotes(clinic.notes || "");
    setEditOwner(clinic.owner_name || "");
    setEditPhone(clinic.phone || "");
    setEditEmail(clinic.email || "");
    setEditStatus(clinic.status);
    setEditFollowUp(clinic.next_follow_up || "");
    loadContacts(clinic.id);
  };

  const updateClinicField = async (field: keyof Clinic, value: string) => {
    if (!selectedClinic) return;
    const updateData = { [field]: value || null } as any;
    await supabase.from("clinics").update(updateData).eq("id", selectedClinic.id);
    setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, [field]: value || null } as Clinic : c));
    setSelectedClinic((prev) => prev ? { ...prev, [field]: value || null } as Clinic : prev);
  };

  const handleNotesChange = (val: string) => {
    setEditNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => updateClinicField("notes", val), 800);
  };

  const handleLogActivity = async () => {
    if (!selectedClinic) return;
    await supabase.from("clinic_contacts").insert({
      clinic_id: selectedClinic.id,
      contact_type: logType,
      outcome: logOutcome,
      notes: logNotes || null,
      next_action: logNextAction || null,
      next_action_date: logNextDate || null,
      duration: logDuration || null,
    });
    if (logNextDate) {
      await updateClinicField("next_follow_up", logNextDate);
      setEditFollowUp(logNextDate);
    }
    setShowLogModal(false);
    setLogNotes(""); setLogNextAction(""); setLogNextDate(""); setLogDuration("");
    loadContacts(selectedClinic.id);
    loadLastContacts();
  };

  const handleAddClinic = async () => {
    if (!newName) return;
    await supabase.from("clinics").insert({
      clinic_name: newName,
      state: newState || null,
      city: newCity || null,
      phone: newPhone || null,
      email: newEmail || null,
      website: newWebsite || null,
    });
    setShowAddModal(false);
    setNewName(""); setNewState(""); setNewCity(""); setNewPhone(""); setNewEmail(""); setNewWebsite("");
    loadClinics();
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { alert("CSV is empty"); setImporting(false); return; }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes("clinicname") || h.includes("clinic_name") || h === "name");
      const stateIdx = headers.indexOf("state");
      const cityIdx = headers.indexOf("city");
      const phoneIdx = headers.indexOf("phone");
      const emailIdx = headers.indexOf("email");
      const websiteIdx = headers.indexOf("website");
      const priorityIdx = headers.indexOf("priority");
      const statusIdx = headers.indexOf("status");
      if (nameIdx === -1) { alert("CSV must have a clinicName or clinic_name column"); setImporting(false); return; }

      const parseRow = (line: string) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ""; continue; }
          current += ch;
        }
        values.push(current.trim());
        return values;
      };

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseRow(lines[i]);
        const name = vals[nameIdx];
        if (!name) continue;
        rows.push({
          clinic_name: name,
          state: (stateIdx >= 0 ? vals[stateIdx] : null) || null,
          city: (cityIdx >= 0 ? vals[cityIdx] : null) || null,
          phone: (phoneIdx >= 0 ? vals[phoneIdx] : null) || null,
          email: (emailIdx >= 0 ? vals[emailIdx] : null) || null,
          website: (websiteIdx >= 0 ? vals[websiteIdx] : null) || null,
          priority: (priorityIdx >= 0 ? vals[priorityIdx] : null) || "Medium",
          status: (statusIdx >= 0 ? vals[statusIdx] : null) || "New",
        });
      }

      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        await supabase.from("clinics").insert(rows.slice(i, i + 100));
      }
      alert(`Imported ${rows.length} clinics`);
      loadClinics();
    } catch (err) {
      alert("Import failed. Check CSV format.");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCall = async (clinic: Clinic) => {
    if (!clinic.phone || callingId) return;
    setCallingId(clinic.id);
    try {
      const { data: result, error } = await supabase.functions.invoke("twilio-voice", {
        body: { clientPhone: clinic.phone, userPhone: savedPhones[0]?.phone },
      });
      if (error) throw error;
      if (result?.success) {
        await supabase.from("call_records").insert({ twilio_call_sid: result.callSid, status: "initiated" });
      }
    } catch {}
    setCallingId(null);
  };

  const filtered = clinics.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.clinic_name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    const matchState = !filterState || c.state === filterState;
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchPriority = !filterPriority || c.priority === filterPriority;
    return matchSearch && matchState && matchStatus && matchPriority;
  });

  const isOverdue = (d: string | null) => {
    if (!d) return false;
    return new Date(d) < new Date(new Date().toDateString());
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#555" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#09090b" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#555" }} />
          <Input
            placeholder="Search clinics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-0 text-sm"
            style={{ background: "#1a1a1a", color: "#fff", height: 36 }}
          />
        </div>
        <FilterDropdown label="State" options={STATES} value={filterState} onChange={setFilterState} />
        <FilterDropdown label="Status" options={STATUSES} value={filterStatus} onChange={setFilterStatus} />
        <FilterDropdown label="Priority" options={PRIORITIES} value={filterPriority} onChange={setFilterPriority} />
        <Button onClick={() => setShowAddModal(true)} size="sm" className="border-0 text-xs" style={{ background: "#2D6BE4", color: "#fff" }}>
          <Plus className="w-3 h-3 mr-1" /> Add Clinic
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
        <Button onClick={() => fileInputRef.current?.click()} disabled={importing} size="sm" variant="ghost" className="text-xs" style={{ color: "#666" }}>
          <Upload className="w-3 h-3 mr-1" /> {importing ? "Importing..." : "Bulk Upload CSV"}
        </Button>
        <span className="text-xs ml-auto" style={{ color: "#555" }}>{filtered.length} clinics</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
              {["Clinic", "State", "City", "Phone", "Email", "Status", "Priority", "Last Contact", "Follow Up", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-2 font-medium" style={{ color: "#555", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.New;
              const overdue = isOverdue(c.next_follow_up);
              return (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid #111" }}>
                  <td className="px-4 py-2">
                    <button onClick={() => openDetail(c)} className="text-left hover:underline font-medium" style={{ color: "#fff" }}>{c.clinic_name}</button>
                  </td>
                  <td className="px-4 py-2" style={{ color: "#888" }}>{c.state ? c.state.replace("New South Wales", "NSW").replace("Victoria", "VIC").replace("Queensland", "QLD").replace("Western Australia", "WA").replace("South Australia", "SA").replace("Northern Territory", "NT").replace("Tasmania", "TAS") : "—"}</td>
                  <td className="px-4 py-2" style={{ color: "#888" }}>{c.city || "—"}</td>
                  <td className="px-4 py-2">
                    {c.phone ? (
                      <button onClick={() => handleCall(c)} className="flex items-center gap-1 hover:text-green-400 transition-colors" style={{ color: "#22c55e" }}>
                        {callingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
                        <span className="text-xs">{c.phone}</span>
                      </button>
                    ) : <span style={{ color: "#333" }}>—</span>}
                  </td>
                  <td className="px-4 py-2">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-blue-400 transition-colors" style={{ color: "#60a5fa" }}>
                        <Mail className="w-3 h-3" />
                        <span className="text-xs truncate max-w-[120px]">{c.email}</span>
                      </a>
                    ) : <span style={{ color: "#333" }}>—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: sc.bg, color: sc.text }}>{c.status}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] font-bold" style={{ color: PRIORITY_COLORS[c.priority] || "#666" }}>● {c.priority}</span>
                  </td>
                  <td className="px-4 py-2" style={{ color: "#555", fontSize: 11 }}>
                    {lastContacts[c.id] ? relativeTime(lastContacts[c.id]) : "—"}
                  </td>
                  <td className="px-4 py-2" style={{ fontSize: 11, color: overdue ? "#ef4444" : "#888" }}>
                    {c.next_follow_up || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      {c.phone && (
                        <button onClick={() => handleCall(c)} className="p-1 rounded hover:bg-white/5" title="Call">
                          <PhoneCall className="w-3 h-3" style={{ color: "#22c55e" }} />
                        </button>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="p-1 rounded hover:bg-white/5" title="Email">
                          <Mail className="w-3 h-3" style={{ color: "#60a5fa" }} />
                        </a>
                      )}
                      <button onClick={() => { openDetail(c); setShowLogModal(true); }} className="p-1 rounded hover:bg-white/5" title="Log Activity">
                        <MessageSquare className="w-3 h-3" style={{ color: "#a855f7" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: "#333", fontSize: 13 }}>No clinics found. Try adjusting your filters or import data.</div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedClinic && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedClinic(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md h-full overflow-y-auto"
            style={{ background: "#0f0f12", borderLeft: "1px solid #1f1f23" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#fff" }}>{selectedClinic.clinic_name}</h2>
                  <p className="text-xs mt-1" style={{ color: "#666" }}>
                    {selectedClinic.city && `${selectedClinic.city}, `}{selectedClinic.state}
                  </p>
                  {selectedClinic.website && (
                    <a href={selectedClinic.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-xs hover:underline" style={{ color: "#2D6BE4" }}>
                      <ExternalLink className="w-3 h-3" /> Website
                    </a>
                  )}
                </div>
                <button onClick={() => setSelectedClinic(null)} className="p-1 rounded hover:bg-white/5">
                  <X className="w-4 h-4" style={{ color: "#666" }} />
                </button>
              </div>

              {/* Editable fields */}
              <div className="space-y-3 mb-5">
                <FieldRow label="Owner">
                  <Input value={editOwner} onChange={(e) => setEditOwner(e.target.value)} onBlur={() => updateClinicField("owner_name", editOwner)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                </FieldRow>
                <FieldRow label="Phone">
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} onBlur={() => updateClinicField("phone", editPhone)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                </FieldRow>
                <FieldRow label="Email">
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} onBlur={() => updateClinicField("email", editEmail)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                </FieldRow>
                <FieldRow label="Status">
                  <select value={editStatus} onChange={(e) => { setEditStatus(e.target.value); updateClinicField("status", e.target.value); }} className="w-full rounded px-2 py-1 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Priority">
                  <select value={editPriority} onChange={(e) => { setEditPriority(e.target.value); updateClinicField("priority", e.target.value); }} className="w-full rounded px-2 py-1 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Follow Up">
                  <Input type="date" value={editFollowUp} onChange={(e) => { setEditFollowUp(e.target.value); updateClinicField("next_follow_up", e.target.value); }} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                </FieldRow>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#555", letterSpacing: "0.12em" }}>Notes</div>
                <Textarea value={editNotes} onChange={(e) => handleNotesChange(e.target.value)} rows={3} className="border-0 text-xs resize-none" style={{ background: "#1a1a1a", color: "#fff" }} placeholder="Add notes..." />
              </div>

              {/* Log Activity Button */}
              <Button onClick={() => setShowLogModal(true)} className="w-full mb-5 border-0 text-xs" style={{ background: "#2D6BE4", color: "#fff" }}>
                <MessageSquare className="w-3 h-3 mr-1" /> Log Activity
              </Button>

              {/* Activity Log */}
              <div>
                <div className="text-[10px] uppercase font-semibold mb-3" style={{ color: "#2D6BE4", letterSpacing: "0.15em" }}>Activity Log</div>
                {contacts.length === 0 ? (
                  <p className="text-xs" style={{ color: "#333" }}>No activity logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((ct) => (
                      <div key={ct.id} className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold" style={{ color: "#2D6BE4" }}>{ct.contact_type}</span>
                          <span className="text-[10px]" style={{ color: "#555" }}>{relativeTime(ct.created_at)}</span>
                        </div>
                        {ct.outcome && <div className="text-xs mb-1" style={{ color: "#999" }}>Outcome: {ct.outcome}</div>}
                        {ct.notes && <div className="text-xs" style={{ color: "#888" }}>{ct.notes}</div>}
                        {ct.next_action && <div className="text-[10px] mt-1" style={{ color: "#666" }}>Next: {ct.next_action} {ct.next_action_date && `(${ct.next_action_date})`}</div>}
                        {ct.duration && <div className="text-[10px]" style={{ color: "#555" }}>Duration: {ct.duration}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showLogModal && selectedClinic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowLogModal(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative rounded-lg p-5 w-full max-w-sm" style={{ background: "#0f0f12", border: "1px solid #1f1f23" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "#fff" }}>Log Activity — {selectedClinic.clinic_name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Type</label>
                <select value={logType} onChange={(e) => setLogType(e.target.value)} className="w-full rounded px-2 py-1.5 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                  {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Outcome</label>
                <select value={logOutcome} onChange={(e) => setLogOutcome(e.target.value)} className="w-full rounded px-2 py-1.5 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {logType === "Call" && (
                <div>
                  <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Duration</label>
                  <Input value={logDuration} onChange={(e) => setLogDuration(e.target.value)} placeholder="e.g. 5 mins" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Notes</label>
                <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={2} className="border-0 text-xs resize-none" style={{ background: "#1a1a1a", color: "#fff" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Next Action</label>
                <Input value={logNextAction} onChange={(e) => setLogNextAction(e.target.value)} placeholder="e.g. Follow up call" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Next Action Date</label>
                <Input type="date" value={logNextDate} onChange={(e) => setLogNextDate(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleLogActivity} className="flex-1 border-0 text-xs" style={{ background: "#2D6BE4", color: "#fff" }}>Save</Button>
                <Button onClick={() => setShowLogModal(false)} variant="ghost" className="text-xs" style={{ color: "#666" }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Clinic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative rounded-lg p-5 w-full max-w-sm" style={{ background: "#0f0f12", border: "1px solid #1f1f23" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "#fff" }}>Add Clinic</h3>
            <div className="space-y-3">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Clinic name *" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              <Input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="State" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} placeholder="Website" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAddClinic} className="flex-1 border-0 text-xs" style={{ background: "#2D6BE4", color: "#fff" }}>Add</Button>
                <Button onClick={() => setShowAddModal(false)} variant="ghost" className="text-xs" style={{ color: "#666" }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#555", letterSpacing: "0.12em" }}>{label}</div>
      {children}
    </div>
  );
}

function FilterDropdown({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded px-2 py-1.5 text-xs border-0"
      style={{ background: "#1a1a1a", color: value ? "#fff" : "#666", minWidth: 90 }}
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

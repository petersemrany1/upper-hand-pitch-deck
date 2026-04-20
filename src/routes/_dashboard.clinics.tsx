import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Plus, Phone, Mail, X, ChevronDown, ChevronRight,
  PhoneCall, Loader2, ExternalLink, Calendar, MessageSquare,
  Upload, Clock, AlertCircle, Trash2, Video, Send,
} from "lucide-react";
import { sendPaymentLinkSMS } from "@/utils/twilio.functions";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { ClinicSmsPreview } from "@/components/ClinicSmsPreview";
import { CallReviewPopup, type AutoCallAnalysis } from "@/components/CallReviewPopup";

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
  reminder_sent: boolean;
};

type ClinicContact = {
  id: string;
  clinic_id: string;
  contact_type: string;
  outcome: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  next_action_time: string | null;
  duration: string | null;
  created_at: string;
};

// Pipeline stages
const PIPELINE_STAGES = [
  "TEST",
  "Not Started",
  "Contacted — No Answer",
  "Contacted — Left Voicemail",
  "Contacted — Gatekeeper",
  "Contacted — Call Me Back",
  "Call Back — Specific Time",
  "Contacted — Not Interested",
  "Zoom Set",
  "Zoom Completed",
  "Signed",
  "Lost",
  "Not Applicable",
] as const;

// Stages considered inactive — collapsed/hidden from main pipeline view by default
const NOT_APPLICABLE_STAGES = new Set(["Not Applicable"]);

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "TEST": { bg: "#1e3a5f", text: "#60a5fa" },
  "Not Started": { bg: "#27272a", text: "#a1a1aa" },
  "Contacted — No Answer": { bg: "#1e293b", text: "#94a3b8" },
  "Contacted — Left Voicemail": { bg: "#1e293b", text: "#94a3b8" },
  "Contacted — Gatekeeper": { bg: "#431407", text: "#fb923c" },
  "Contacted — Call Me Back": { bg: "#451a03", text: "#fbbf24" },
  "Call Back — Specific Time": { bg: "#451a03", text: "#fbbf24" },
  "Contacted — Not Interested": { bg: "#450a0a", text: "#f87171" },
  "Zoom Set": { bg: "#2e1065", text: "#c084fc" },
  "Zoom Completed": { bg: "#1e3a5f", text: "#60a5fa" },
  "Signed": { bg: "#064e3b", text: "#34d399" },
  "Lost": { bg: "#3b0a0a", text: "#dc2626" },
  "Not Applicable": { bg: "#1a1a1a", text: "#555" },
};

// Outcome options by contact type
const CALL_OUTCOMES = [
  "No Answer", "Left Voicemail", "Spoke — Gatekeeper",
  "Spoke — Not Interested", "Spoke — Call Me Back",
  "Call Back — Specific Time",
  "Spoke — Interested", "Spoke — Zoom Set",
  "Not Applicable — Doesn't Do Transplants",
];
const EMAIL_OUTCOMES = ["Sent", "Replied — Interested", "Replied — Not Interested", "No Reply"];
const LOOM_OUTCOMES = ["Sent", "Opened", "Replied"];
const ZOOM_OUTCOMES = ["Qualified — Ready to Sign", "Qualified — Needs Follow Up", "Not Qualified — Budget", "Not Qualified — Wrong Fit", "No Show", "Rescheduled"];

const OUTCOME_MAP: Record<string, string[]> = {
  Call: CALL_OUTCOMES, Email: EMAIL_OUTCOMES, Loom: LOOM_OUTCOMES, Zoom: ZOOM_OUTCOMES,
};

// Map outcomes to pipeline stages
const OUTCOME_TO_STAGE: Record<string, string> = {
  "No Answer": "Contacted — No Answer",
  "Left Voicemail": "Contacted — Left Voicemail",
  "Spoke — Gatekeeper": "Contacted — Gatekeeper",
  "Spoke — Not Interested": "Contacted — Not Interested",
  "Spoke — Call Me Back": "Contacted — Call Me Back",
  "Call Back — Specific Time": "Call Back — Specific Time",
  "Spoke — Interested": "Contacted — Call Me Back",
  "Spoke — Zoom Set": "Zoom Set",
  "Not Applicable — Doesn't Do Transplants": "Not Applicable",
  "Qualified — Ready to Sign": "Signed",
  "Qualified — Needs Follow Up": "Zoom Completed",
  "Not Qualified — Budget": "Lost",
  "Not Qualified — Wrong Fit": "Lost",
  "No Show": "Zoom Set",
  "Rescheduled": "Zoom Set",
  "Replied — Not Interested": "Contacted — Not Interested",
};

const CONTACT_TYPES = ["Call", "Email", "Loom", "Zoom"];

const STATES_ABBR: Record<string, string> = {
  "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD",
  "Western Australia": "WA", "South Australia": "SA", "Tasmania": "TAS",
  "ACT": "ACT", "Northern Territory": "NT",
};
const STATES = ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "ACT", "Northern Territory"];

const TYPE_EMOJI: Record<string, string> = { Call: "📞", Email: "✉️", Loom: "🎥", Zoom: "📹" };

type SavedPhone = { name: string; phone: string };
const DEFAULT_PHONES: SavedPhone[] = [{ name: "Peter Semrany", phone: "0418214953" }];
function getStoredPhones(): SavedPhone[] {
  try {
    const stored = localStorage.getItem("saved_caller_phones");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_PHONES;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} ${time}`;
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

function getNextActionText(clinic: Clinic, lastContact: ClinicContact | null): { text: string; overdue: boolean } {
  const today = new Date().toISOString().split("T")[0];

  if (clinic.status === "Not Started") return { text: "🆕 Not contacted", overdue: false };
  if (clinic.status === "Signed" || clinic.status === "Lost" || clinic.status === "Contacted — Not Interested" || clinic.status === "Not Applicable") return { text: "—", overdue: false };

  if (clinic.status === "Zoom Set" && clinic.next_follow_up) {
    const isOverdue = clinic.next_follow_up < today;
    return { text: `📹 Zoom ${clinic.next_follow_up}`, overdue: isOverdue };
  }

  if (clinic.status === "Call Back — Specific Time" && clinic.next_follow_up) {
    const isOverdue = clinic.next_follow_up < today;
    const timeWindow = lastContact?.next_action_time ? ` ${lastContact.next_action_time}` : "";
    return { text: `📞 Call back ${clinic.next_follow_up}${timeWindow}`, overdue: isOverdue };
  }

  if (clinic.status === "Contacted — Call Me Back" && clinic.next_follow_up) {
    const isOverdue = clinic.next_follow_up < today;
    return { text: `📞 Call back ${clinic.next_follow_up}`, overdue: isOverdue };
  }

  if (clinic.status === "Contacted — No Answer" || clinic.status === "Contacted — Left Voicemail") {
    const isOverdue = clinic.next_follow_up ? clinic.next_follow_up < today : false;
    return { text: "📞 Follow up — no answer", overdue: isOverdue };
  }

  if (clinic.status === "Contacted — Gatekeeper") {
    return { text: "📞 Call back — waiting for owner", overdue: false };
  }

  if (clinic.status === "Zoom Completed") {
    return { text: "✉️ Send follow-up", overdue: false };
  }

  if (clinic.next_follow_up) {
    const isOverdue = clinic.next_follow_up < today;
    return { text: `📞 Follow up ${clinic.next_follow_up}`, overdue: isOverdue };
  }

  return { text: "—", overdue: false };
}

// Truncate latest activity note for inline table preview
function truncateNote(text: string | null | undefined, max = 40): string {
  if (!text) return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1) + "…";
}

function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  // All states collapsed by default
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of STATES) init[s] = true;
    init["Unknown"] = true;
    return init;
  });

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
  const [logOutcome, setLogOutcome] = useState("No Answer");
  const [logNotes, setLogNotes] = useState("");
  const [logNextDate, setLogNextDate] = useState("");
  const [logNextTime, setLogNextTime] = useState("");
  const [logOwnerName, setLogOwnerName] = useState("");
  const [logDuration, setLogDuration] = useState("");

  // Add clinic modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  // Bulk CSV
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call (browser-based via Twilio Voice SDK)
  const [callingId, setCallingId] = useState<string | null>(null);
  const { status: deviceStatus, call: deviceCall, hangup: deviceHangup } = useTwilioDevice();

  // Auto-analysis review popup
  type PendingReview = {
    callRecordId: string;
    clinicId: string;
    clinicName: string;
    analysis: AutoCallAnalysis;
    duration: number | null;
  };
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);

  // Last contact per clinic
  const [lastContacts, setLastContacts] = useState<Record<string, ClinicContact>>({});

  // Today's actions panel
  const [todayExpanded, setTodayExpanded] = useState(false);

  const loadClinics = useCallback(async () => {
    const { data } = await supabase.from("clinics").select("*").order("created_at", { ascending: false });
    if (data) setClinics(data as Clinic[]);
    setLoading(false);
  }, []);

  const loadLastContacts = useCallback(async () => {
    // Only fetch latest contact per clinic. Cap rows to avoid scanning the full
    // table on every mount and after every Log Activity.
    const { data } = await supabase
      .from("clinic_contacts")
      .select("id, clinic_id, contact_type, outcome, notes, next_action, next_action_date, next_action_time, duration, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data) {
      const map: Record<string, ClinicContact> = {};
      for (const d of data as ClinicContact[]) {
        if (!map[d.clinic_id]) map[d.clinic_id] = d;
      }
      setLastContacts(map);
    }
  }, []);

  useEffect(() => { loadClinics(); loadLastContacts(); }, [loadClinics, loadLastContacts]);

  // Escape key dismisses the side panel
  useEffect(() => {
    if (!selectedClinic) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedClinic(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClinic]);


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

  const updateClinicField = async (field: keyof Clinic, value: string | boolean) => {
    if (!selectedClinic) return;
    const updateData = { [field]: value === "" ? null : value } as any;
    await supabase.from("clinics").update(updateData).eq("id", selectedClinic.id);
    setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, [field]: value === "" ? null : value } as any : c));
    setSelectedClinic((prev) => prev ? { ...prev, [field]: value === "" ? null : value } as any : prev);
  };

  const handleNotesChange = (val: string) => {
    setEditNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => updateClinicField("notes", val), 800);
  };

  const handleLogActivity = async () => {
    if (!selectedClinic) return;

    // Insert contact
    await supabase.from("clinic_contacts").insert({
      clinic_id: selectedClinic.id,
      contact_type: logType,
      outcome: logOutcome,
      notes: logNotes || null,
      next_action: null,
      next_action_date: logNextDate || null,
      next_action_time: logNextTime || null,
      duration: logDuration || null,
    });

    // Auto-update stage based on outcome
    const newStage = OUTCOME_TO_STAGE[logOutcome];
    if (newStage) {
      await supabase.from("clinics").update({ status: newStage }).eq("id", selectedClinic.id);
      setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, status: newStage } : c));
      setSelectedClinic((prev) => prev ? { ...prev, status: newStage } : prev);
      setEditStatus(newStage);
    }

    // Update follow-up date if set
    if (logNextDate) {
      await supabase.from("clinics").update({ next_follow_up: logNextDate }).eq("id", selectedClinic.id);
      setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, next_follow_up: logNextDate } : c));
      setSelectedClinic((prev) => prev ? { ...prev, next_follow_up: logNextDate } : prev);
      setEditFollowUp(logNextDate);
    }

    // Update owner if provided
    if (logOwnerName) {
      await supabase.from("clinics").update({ owner_name: logOwnerName }).eq("id", selectedClinic.id);
      setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, owner_name: logOwnerName } : c));
      setSelectedClinic((prev) => prev ? { ...prev, owner_name: logOwnerName } : prev);
      setEditOwner(logOwnerName);
    }

    setShowLogModal(false);
    setLogNotes(""); setLogNextDate(""); setLogNextTime(""); setLogDuration("");
    loadContacts(selectedClinic.id);
    loadLastContacts();
  };

  const openLogModal = () => {
    setLogType("Call");
    setLogOutcome(CALL_OUTCOMES[0]);
    setLogOwnerName(selectedClinic?.owner_name || "");
    setShowLogModal(true);
  };

  const handleTypeChange = (type: string) => {
    setLogType(type);
    const outcomes = OUTCOME_MAP[type] || CALL_OUTCOMES;
    setLogOutcome(outcomes[0]);
  };

  const needsDateTimePicker =
    logOutcome === "Spoke — Call Me Back" ||
    logOutcome === "Spoke — Zoom Set" ||
    logOutcome === "Call Back — Specific Time";
  const isSpecificTimeRange = logOutcome === "Call Back — Specific Time";

  const handleAddClinic = async () => {
    if (!newName) return;
    await supabase.from("clinics").insert({
      clinic_name: newName,
      state: newState || null,
      city: newCity || null,
      phone: newPhone || null,
      email: newEmail || null,
      website: newWebsite || null,
      status: "Not Started",
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
          status: "Not Started",
        });
      }

      for (let i = 0; i < rows.length; i += 100) {
        await supabase.from("clinics").insert(rows.slice(i, i + 100));
      }
      alert(`Imported ${rows.length} clinics`);
      loadClinics();
    } catch {
      alert("Import failed. Check CSV format.");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCall = async (clinic: Clinic) => {
    if (!clinic.phone) return;
    // If already on a call with this clinic, hang up
    if (callingId === clinic.id) {
      deviceHangup();
      setCallingId(null);
      return;
    }
    if (callingId) return; // another call in progress
    if (deviceStatus !== "ready" && deviceStatus !== "in-call") {
      alert("Phone is still connecting. Try again in a moment.");
      return;
    }
    setCallingId(clinic.id);
    try {
      await deviceCall(clinic.phone, { clinicId: clinic.id });
    } catch (err) {
      console.error("Call failed:", err);
      setCallingId(null);
    }
  };

  // Reset callingId when call ends
  useEffect(() => {
    if (deviceStatus === "ready" && callingId) {
      setCallingId(null);
    }
  }, [deviceStatus, callingId]);

  // Filtering
  const filtered = clinics.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.clinic_name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    const matchState = !filterState || c.state === filterState;
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchState && matchStatus;
  });

  // Split active vs not-applicable, then group active by state
  const activeFiltered = filtered.filter((c) => !NOT_APPLICABLE_STAGES.has(c.status));
  const notApplicableFiltered = filtered.filter((c) => NOT_APPLICABLE_STAGES.has(c.status));
  const grouped: Record<string, Clinic[]> = {};
  for (const c of activeFiltered) {
    const st = c.state || "Unknown";
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(c);
  }
  const stateOrder = [...STATES, "Unknown"];
  const sortedStates = stateOrder.filter((s) => grouped[s]?.length);
  const [naCollapsed, setNaCollapsed] = [collapsedStates["__NA__"] !== false, (v: boolean) => setCollapsedStates((p) => ({ ...p, __NA__: !v }))];

  const toggleState = (state: string) => {
    setCollapsedStates((prev) => ({ ...prev, [state]: !prev[state] }));
  };

  // Today's actions
  const today = new Date().toISOString().split("T")[0];
  const todayActions = clinics.filter((c) => {
    if (c.next_follow_up && c.next_follow_up <= today && c.status !== "Signed" && c.status !== "Lost" && c.status !== "Contacted — Not Interested") return true;
    return false;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#555" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#09090b" }}>
      {/* Today's Actions Panel */}
      {todayActions.length > 0 && (
        <div style={{ borderBottom: "1px solid #1a1a1a" }}>
          <button
            onClick={() => setTodayExpanded(!todayExpanded)}
            className="w-full flex items-center gap-2 px-5 py-2 hover:bg-white/[0.02] transition-colors"
          >
            {todayExpanded ? <ChevronDown className="w-3 h-3" style={{ color: "#f59e0b" }} /> : <ChevronRight className="w-3 h-3" style={{ color: "#f59e0b" }} />}
            <AlertCircle className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
            <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>TODAY'S ACTIONS</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#dc2626", color: "#fff" }}>{todayActions.length}</span>
          </button>
          {todayExpanded && (
            <div className="px-5 pb-3 space-y-1">
              {todayActions.map((c) => {
                const action = getNextActionText(c, lastContacts[c.id] || null);
                return (
                  <div key={c.id} className="flex items-center gap-3 py-1.5 px-3 rounded" style={{ background: "#1a1a1a" }}>
                    <button onClick={() => openDetail(c)} className="text-xs font-semibold hover:underline truncate" style={{ color: "#fff", minWidth: 120 }}>{c.clinic_name}</button>
                    <span className="text-[11px] flex-1 truncate" style={{ color: "#f59e0b" }}>{action.text}</span>
                    {c.phone && (
                      <button onClick={() => handleCall(c)} className="p-1 rounded hover:bg-white/5" title="Call now">
                        <PhoneCall className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
        <FilterDropdown label="Stage" options={[...PIPELINE_STAGES]} value={filterStatus} onChange={setFilterStatus} />
        <Button onClick={() => setShowAddModal(true)} size="sm" className="border-0 text-xs" style={{ background: "#2D6BE4", color: "#fff" }}>
          <Plus className="w-3 h-3 mr-1" /> Add Clinic
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
        <Button onClick={() => fileInputRef.current?.click()} disabled={importing} size="sm" variant="ghost" className="text-xs" style={{ color: "#666" }}>
          <Upload className="w-3 h-3 mr-1" /> {importing ? "Importing..." : "Bulk Upload CSV"}
        </Button>
        <span className="text-xs ml-auto" style={{ color: "#555" }}>
          {activeFiltered.length} active{notApplicableFiltered.length > 0 && ` · ${notApplicableFiltered.length} N/A`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {sortedStates.map((state) => {
          const isCollapsed = collapsedStates[state] !== false;
          const stateClinics = grouped[state];
          const abbr = STATES_ABBR[state] || state;
          return (
            <div key={state}>
              <button
                onClick={() => toggleState(state)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: "1px solid #1a1a1a" }}
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" style={{ color: "#555" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "#555" }} />}
                <span className="text-xs font-semibold" style={{ color: "#2D6BE4", letterSpacing: "0.1em" }}>{abbr}</span>
                <span className="text-[10px]" style={{ color: "#555" }}>({stateClinics.length})</span>
              </button>
              {!isCollapsed && (
                <div>
                  {stateClinics.map((c) => {
                    const sc = STAGE_COLORS[c.status] || STAGE_COLORS["Not Started"];
                    const nextAction = getNextActionText(c, lastContacts[c.id] || null);
                    const lastCt = lastContacts[c.id];
                    const notePreview = truncateNote(lastCt?.notes || lastCt?.outcome);

                    return (
                      <div
                        key={c.id}
                        className="flex items-center hover:bg-white/[0.02] transition-colors"
                        style={{ height: 44, borderBottom: "1px solid #111" }}
                      >
                        {/* Clinic Name */}
                        <div className="w-[180px] shrink-0 px-3 truncate">
                          <button onClick={() => openDetail(c)} className="text-left hover:underline font-semibold truncate block text-xs" style={{ color: "#fff" }}>{c.clinic_name}</button>
                        </div>
                        {/* City */}
                        <div className="w-[90px] shrink-0 px-2 truncate text-[11px]" style={{ color: "#666" }}>{c.city || "—"}</div>
                        {/* Phone */}
                        <div className="w-[140px] shrink-0 px-2">
                          {c.phone ? (
                            <button onClick={() => handleCall(c)} className="flex items-center gap-1 text-[11px] hover:brightness-125 transition" style={{ color: "#22c55e" }}>
                              {callingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3 shrink-0" />}
                              <span className="truncate">{c.phone}</span>
                            </button>
                          ) : <span style={{ color: "#222" }} className="text-[11px]">—</span>}
                        </div>
                        {/* Latest Note */}
                        <div className="w-[200px] shrink-0 px-2 truncate text-[11px]" title={lastCt?.notes || lastCt?.outcome || ""} style={{ color: notePreview ? "#9ca3af" : "#222" }}>
                          {notePreview || "—"}
                        </div>
                        {/* Stage */}
                        <div className="w-[130px] shrink-0 px-2">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap" style={{ background: sc.bg, color: sc.text }}>
                            {c.status === "Not Started" ? "Not Started" : c.status.replace("Contacted — ", "")}
                          </span>
                        </div>
                        {/* Next Action */}
                        <div className="flex-1 min-w-0 px-2 truncate text-[11px]" style={{ color: nextAction.overdue ? "#ef4444" : "#888" }}>
                          {nextAction.text}
                        </div>
                        {/* Actions */}
                        <div className="w-[70px] shrink-0 px-2 flex items-center gap-0.5">
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
                          <button onClick={() => { openDetail(c); setTimeout(openLogModal, 100); }} className="p-1 rounded hover:bg-white/5" title="Log">
                            <MessageSquare className="w-3 h-3" style={{ color: "#a855f7" }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Not Applicable section — collapsed by default */}
        {notApplicableFiltered.length > 0 && (
          <div>
            <button
              onClick={() => setNaCollapsed(!naCollapsed)}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] transition-colors"
              style={{ borderBottom: "1px solid #1a1a1a" }}
            >
              {naCollapsed ? <ChevronRight className="w-3 h-3" style={{ color: "#555" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "#555" }} />}
              <span className="text-xs font-semibold" style={{ color: "#555", letterSpacing: "0.1em" }}>NOT APPLICABLE</span>
              <span className="text-[10px]" style={{ color: "#555" }}>({notApplicableFiltered.length})</span>
            </button>
            {!naCollapsed && (
              <div>
                {notApplicableFiltered.map((c) => {
                  const sc = STAGE_COLORS[c.status] || STAGE_COLORS["Not Started"];
                  const lastCt = lastContacts[c.id];
                  const notePreview = truncateNote(lastCt?.notes || lastCt?.outcome);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center hover:bg-white/[0.02] transition-colors opacity-60"
                      style={{ height: 44, borderBottom: "1px solid #111" }}
                    >
                      <div className="w-[180px] shrink-0 px-3 truncate">
                        <button onClick={() => openDetail(c)} className="text-left hover:underline font-semibold truncate block text-xs" style={{ color: "#aaa" }}>{c.clinic_name}</button>
                      </div>
                      <div className="w-[90px] shrink-0 px-2 truncate text-[11px]" style={{ color: "#555" }}>{c.city || "—"}</div>
                      <div className="w-[140px] shrink-0 px-2 text-[11px]" style={{ color: "#555" }}>{c.phone || "—"}</div>
                      <div className="w-[200px] shrink-0 px-2 truncate text-[11px]" title={lastCt?.notes || lastCt?.outcome || ""} style={{ color: "#555" }}>{notePreview || "—"}</div>
                      <div className="w-[130px] shrink-0 px-2">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap" style={{ background: sc.bg, color: sc.text }}>N/A</span>
                      </div>
                      <div className="flex-1 min-w-0 px-2 truncate text-[11px]" style={{ color: "#555" }}>—</div>
                      <div className="w-[70px] shrink-0 px-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: "#333", fontSize: 13 }}>No clinics found.</div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedClinic && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedClinic(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md h-full overflow-y-auto"
            style={{ background: "#09090b", borderLeft: "1px solid #1f1f23" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              {/* Close button */}
              <div className="flex justify-end">
                <button onClick={() => setSelectedClinic(null)} className="p-1 rounded hover:bg-white/5">
                  <X className="w-4 h-4" style={{ color: "#666" }} />
                </button>
              </div>

              {/* ===== SECTION 1: CLINIC INFO ===== */}
              <div className="rounded-lg p-4" style={{ background: "#111114", border: "1px solid #1f1f23" }}>
                <div className="text-[10px] uppercase font-bold mb-3" style={{ color: "#2D6BE4", letterSpacing: "0.15em" }}>CLINIC INFO</div>

                <h2 className="text-lg font-bold mb-1" style={{ color: "#fff" }}>{selectedClinic.clinic_name}</h2>
                <p className="text-xs mb-1" style={{ color: "#666" }}>
                  {selectedClinic.city && `${selectedClinic.city}, `}{selectedClinic.state}
                </p>
                {selectedClinic.website && (
                  <a href={selectedClinic.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mb-3 text-xs hover:underline" style={{ color: "#2D6BE4" }}>
                    <ExternalLink className="w-3 h-3" /> Website
                  </a>
                )}

                {/* NEXT ACTION banner */}
                {(() => {
                  const action = getNextActionText(selectedClinic, contacts[0] || null);
                  if (action.text === "—") return null;
                  return (
                    <div className="rounded-lg p-3 mb-3 flex items-center gap-2" style={{ background: action.overdue ? "#451a03" : "#172554", border: `1px solid ${action.overdue ? "#92400e" : "#1e40af"}` }}>
                      <Clock className="w-4 h-4 shrink-0" style={{ color: action.overdue ? "#f59e0b" : "#60a5fa" }} />
                      <div>
                        <div className="text-[10px] uppercase font-bold" style={{ color: action.overdue ? "#f59e0b" : "#60a5fa", letterSpacing: "0.1em" }}>NEXT ACTION</div>
                        <div className="text-xs font-medium" style={{ color: "#fff" }}>{action.text}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <FieldRow label="Owner">
                    <Input value={editOwner} onChange={(e) => setEditOwner(e.target.value)} onBlur={() => updateClinicField("owner_name", editOwner)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                  </FieldRow>
                  <FieldRow label="Phone">
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} onBlur={() => updateClinicField("phone", editPhone)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                  </FieldRow>
                  <FieldRow label="Email">
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} onBlur={() => updateClinicField("email", editEmail)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                  </FieldRow>
                  <FieldRow label="Stage">
                    <select value={editStatus} onChange={(e) => { setEditStatus(e.target.value); updateClinicField("status", e.target.value); }} className="w-full rounded px-2 py-1 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                      {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Follow Up">
                    <Input type="date" value={editFollowUp} onChange={(e) => { setEditFollowUp(e.target.value); updateClinicField("next_follow_up", e.target.value); }} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                  </FieldRow>
                  <FieldRow label="Notes">
                    <Textarea value={editNotes} onChange={(e) => handleNotesChange(e.target.value)} rows={3} className="border-0 text-xs resize-none" style={{ background: "#1a1a1a", color: "#fff" }} placeholder="Add notes..." />
                  </FieldRow>
                </div>
              </div>

              {/* ===== SECTION 2: LOG ACTIVITY ===== */}
              <div className="rounded-lg p-4" style={{ background: "#0f1117", border: "1px solid #1e293b" }}>
                <div className="text-[10px] uppercase font-bold mb-3" style={{ color: "#2D6BE4", letterSpacing: "0.15em" }}>LOG ACTIVITY</div>
                <Button onClick={openLogModal} className="w-full border-0 text-xs font-semibold" style={{ background: "#2D6BE4", color: "#fff" }}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Log Activity
                </Button>
              </div>

              {/* ===== LATEST SMS ===== */}
              <ClinicSmsPreview clinicId={selectedClinic.id} clinicPhone={selectedClinic.phone} />

              {/* ===== SECTION 3: ACTIVITY TIMELINE ===== */}
              <div className="rounded-lg p-4" style={{ background: "#111114", border: "1px solid #1f1f23" }}>
                <div className="text-[10px] uppercase font-bold mb-3" style={{ color: "#2D6BE4", letterSpacing: "0.15em" }}>ACTIVITY TIMELINE</div>
                {contacts.length === 0 ? (
                  <p className="text-xs" style={{ color: "#333" }}>No activity logged yet.</p>
                ) : (
                  <div className="relative pl-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: "#222" }} />
                    <div className="space-y-4">
                      {contacts.map((ct) => {
                        const emoji = TYPE_EMOJI[ct.contact_type] || "📝";
                        const waitingOn = ct.outcome?.includes("Call Me Back")
                          ? "Waiting for owner callback"
                          : ct.outcome?.includes("Wrong Person") || ct.outcome?.includes("Gatekeeper")
                          ? "Waiting for owner callback"
                          : ct.outcome?.includes("Zoom Set")
                          ? `Zoom scheduled${ct.next_action_date ? ` — ${ct.next_action_date}${ct.next_action_time ? ` ${ct.next_action_time}` : ""}` : ""}`
                          : ct.outcome?.includes("Interested") && !ct.outcome?.includes("Not")
                          ? "You need to follow up"
                          : null;

                        return (
                          <TimelineEntry
                            key={ct.id}
                            contact={ct}
                            emoji={emoji}
                            waitingOn={waitingOn}
                            onDelete={async () => {
                              await supabase.from("clinic_contacts").delete().eq("id", ct.id);
                              const { count } = await supabase
                                .from("clinic_contacts")
                                .select("*", { count: "exact", head: true })
                                .eq("clinic_id", selectedClinic.id);
                              if (!count || count === 0) {
                                await supabase.from("clinics").update({ status: "Not Started", next_follow_up: null }).eq("id", selectedClinic.id);
                                setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, status: "Not Started", next_follow_up: null } : c));
                                setSelectedClinic((prev) => prev ? { ...prev, status: "Not Started", next_follow_up: null } : prev);
                                setEditStatus("Not Started");
                                setEditFollowUp("");
                              } else {
                                const { data: withDates } = await supabase
                                  .from("clinic_contacts")
                                  .select("next_action_date")
                                  .eq("clinic_id", selectedClinic.id)
                                  .not("next_action_date", "is", null)
                                  .limit(1);
                                if (!withDates || withDates.length === 0) {
                                  await supabase.from("clinics").update({ next_follow_up: null }).eq("id", selectedClinic.id);
                                  setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, next_follow_up: null } : c));
                                  setSelectedClinic((prev) => prev ? { ...prev, next_follow_up: null } : prev);
                                  setEditFollowUp("");
                                }
                              }
                              loadContacts(selectedClinic.id);
                              loadLastContacts();
                            }}
                          />
                        );
                      })}
                    </div>
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
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Contact Type</label>
                <select value={logType} onChange={(e) => handleTypeChange(e.target.value)} className="w-full rounded px-2 py-1.5 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                  {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Outcome</label>
                <select value={logOutcome} onChange={(e) => setLogOutcome(e.target.value)} className="w-full rounded px-2 py-1.5 text-xs border-0" style={{ background: "#1a1a1a", color: "#fff" }}>
                  {(OUTCOME_MAP[logType] || CALL_OUTCOMES).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Notes</label>
                <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={2} className="border-0 text-xs resize-none" style={{ background: "#1a1a1a", color: "#fff" }} />
              </div>
              {needsDateTimePicker && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>
                      {logOutcome === "Spoke — Zoom Set" ? "Zoom Date" : "Call Back Date"}
                    </label>
                    <Input type="date" value={logNextDate} onChange={(e) => setLogNextDate(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>
                      {isSpecificTimeRange ? "Time Window (e.g. 9am–12pm)" : "Time"}
                    </label>
                    {isSpecificTimeRange ? (
                      <Input
                        type="text"
                        value={logNextTime}
                        onChange={(e) => setLogNextTime(e.target.value)}
                        placeholder="9am–12pm"
                        className="border-0 text-xs h-8"
                        style={{ background: "#1a1a1a", color: "#fff" }}
                      />
                    ) : (
                      <Input type="time" value={logNextTime} onChange={(e) => setLogNextTime(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#555", letterSpacing: "0.1em" }}>Owner Name</label>
                <Input value={logOwnerName} onChange={(e) => setLogOwnerName(e.target.value)} placeholder="Clinic owner name" className="border-0 text-xs h-8" style={{ background: "#1a1a1a", color: "#fff" }} />
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

function TimelineEntry({ contact, emoji, waitingOn, onDelete }: { contact: ClinicContact; emoji: string; waitingOn: string | null; onDelete: () => Promise<void> }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div className="relative group">
      <div className="absolute -left-4 top-1 w-2 h-2 rounded-full" style={{ background: "#2D6BE4" }} />
      <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold" style={{ color: "#fff" }}>
            {emoji} {contact.contact_type}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "#555" }}>{formatDateTime(contact.created_at)}</span>
            {!confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                title="Delete entry"
              >
                <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
              </button>
            )}
          </div>
        </div>
        {confirmDelete && (
          <div className="flex items-center gap-2 mb-1 p-1.5 rounded" style={{ background: "#1c1c1c" }}>
            <span className="text-[10px]" style={{ color: "#f87171" }}>Delete this entry?</span>
            <button onClick={handleDelete} disabled={deleting} className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: "#dc2626", color: "#fff" }}>
              {deleting ? "..." : "Yes"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#333", color: "#999" }}>No</button>
          </div>
        )}
        {contact.outcome && <div className="text-[11px] mb-1" style={{ color: "#999" }}>{contact.outcome}</div>}
        {contact.notes && <div className="text-xs" style={{ color: "#888" }}>{contact.notes}</div>}
        {waitingOn && (
          <div className="text-[10px] mt-1.5 px-2 py-1 rounded inline-block" style={{ background: "#172554", color: "#60a5fa" }}>
            {waitingOn}
          </div>
        )}
      </div>
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

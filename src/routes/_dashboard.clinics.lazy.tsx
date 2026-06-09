import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
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
import { sendBoldContractEmail } from "@/utils/bold-contract.functions";
import { useServerFn } from "@tanstack/react-start";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import { toast } from "sonner";
import { ClinicSmsPreview } from "@/components/ClinicSmsPreview";
import { CallReviewInbox } from "@/components/CallReviewInbox";
import { isValidAUPhone } from "@/utils/phone";
import type { AppliedReview } from "@/components/CallReviewPopup";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";


const routeApi = getRouteApi("/_dashboard/clinics");

export const Route = createLazyFileRoute("/_dashboard/clinics")({
  component: ClinicsPage,
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
  parent_clinic_id: string | null;
  is_parent: boolean;
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
  "Contacted — Gatekeeper",
  "Contacted — Call Me Back",
  "Contacted — Not Interested",
  "Sent Email/Loom",
  "Queue for Sending Letter",
  "Letter Sent",
  "Zoom Set",
  "Contract Sent",
  "Signed",
  "Lost",
  "Not Applicable",
] as const;

// Stages considered inactive — collapsed/hidden from main pipeline view by default
const NOT_APPLICABLE_STAGES = new Set(["Not Applicable"]);

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "TEST": { bg: "#eff6ff", text: "#60a5fa" },
  "Not Started": { bg: "#ebebeb", text: "#111111" },
  "Contacted — No Answer": { bg: "#ebebeb", text: "#111111" },
  
  "Contacted — Gatekeeper": { bg: "#fff1ee", text: "#fb923c" },
  "Contacted — Call Me Back": { bg: "#fffbeb", text: "#fbbf24" },
  "Contacted — Not Interested": { bg: "#fef2f2", text: "#f87171" },
  "Sent Email/Loom": { bg: "#ecfeff", text: "#0891b2" },
  "Queue for Sending Letter": { bg: "#fef9c3", text: "#a16207" },
  "Letter Sent": { bg: "#fff7ed", text: "#ea580c" },
  "Zoom Set": { bg: "#f5f3ff", text: "#c084fc" },
  "Contract Sent": { bg: "#fef3c7", text: "#b45309" },
  "Signed": { bg: "#064e3b", text: "#34d399" },
  "Lost": { bg: "#fef2f2", text: "#dc2626" },
  "Not Applicable": { bg: "#f9f9f9", text: "#111111" },
};

// Outcome options by contact type
const CALL_OUTCOMES = [
  "No Answer", "Left Voicemail", "Spoke — Gatekeeper",
  "Spoke — Not Interested", "Spoke — Call Me Back",
  "Spoke — Interested", "Spoke — Zoom Set",
  "Not Applicable — Doesn't Do Transplants",
];
const EMAIL_OUTCOMES = ["Sent", "Replied — Interested", "Replied — Not Interested", "No Reply"];
const LOOM_OUTCOMES = ["Sent", "Opened", "Replied"];
const ZOOM_OUTCOMES = ["Qualified — Ready to Sign", "Qualified — Needs Follow Up", "Not Qualified — Budget", "Not Qualified — Wrong Fit", "No Show", "Rescheduled"];

const OUTCOME_MAP: Record<string, string[]> = {
  Call: CALL_OUTCOMES, Email: EMAIL_OUTCOMES, Loom: LOOM_OUTCOMES, Zoom: ZOOM_OUTCOMES,
};

// Friendlier display labels for outcome values (value stays the same in DB)
const OUTCOME_LABELS: Record<string, string> = {
  "Spoke — Call Me Back": "They want me to call them back another time",
};
const outcomeLabel = (o: string) => OUTCOME_LABELS[o] ?? o;

// Map outcomes to pipeline stages
const OUTCOME_TO_STAGE: Record<string, string> = {
  "No Answer": "Contacted — No Answer",
  "Left Voicemail": "Contacted — No Answer",
  "Spoke — Gatekeeper": "Contacted — Gatekeeper",
  "Spoke — Not Interested": "Contacted — Not Interested",
  "Spoke — Call Me Back": "Contacted — Call Me Back",
  "Spoke — Interested": "Contacted — Call Me Back",
  "Spoke — Zoom Set": "Zoom Set",
  "Not Applicable — Doesn't Do Transplants": "Not Applicable",
  "Qualified — Ready to Sign": "Signed",
  "Qualified — Needs Follow Up": "Contract Sent",
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

  if (clinic.status === "Contacted — Call Me Back" && clinic.next_follow_up) {
    const isOverdue = clinic.next_follow_up < today;
    return { text: `📞 Call back ${clinic.next_follow_up}`, overdue: isOverdue };
  }

  if (clinic.status === "Contacted — No Answer") {
    const isOverdue = clinic.next_follow_up ? clinic.next_follow_up < today : false;
    return { text: "📞 Follow up — no answer", overdue: isOverdue };
  }

  if (clinic.status === "Contacted — Gatekeeper") {
    return { text: "📞 Call back — waiting for owner", overdue: false };
  }

  if (clinic.next_follow_up) {
    const isOverdue = clinic.next_follow_up < today;
    return { text: `📞 Follow up ${clinic.next_follow_up}`, overdue: isOverdue };
  }

  return { text: "—", overdue: false };
}

// Keep latest activity note as one line and let the column width control truncation
function truncateNote(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
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

  // Resizable column widths (persisted)
  type ColKey = "name" | "city" | "phone" | "note" | "stage" | "actions";
  const DEFAULT_COL_WIDTHS: Record<ColKey, number> = {
    name: 180, city: 90, phone: 140, note: 200, stage: 130, actions: 70,
  };
  const COL_MIN: Record<ColKey, number> = {
    name: 100, city: 60, phone: 90, note: 100, stage: 90, actions: 50,
  };
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("clinics.colWidths.v1") : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_COL_WIDTHS, ...parsed };
      }
    } catch { /* noop */ }
    return DEFAULT_COL_WIDTHS;
  });
  useEffect(() => {
    try { localStorage.setItem("clinics.colWidths.v1", JSON.stringify(colWidths)); } catch { /* noop */ }
  }, [colWidths]);
  const startResize = (key: ColKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[key];
    const min = COL_MIN[key];
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(min, Math.round(startW + (ev.clientX - startX)));
      setColWidths((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

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
  const pendingNotesRef = useRef<string | null>(null);
  const pendingClinicIdRef = useRef<string | null>(null);
  const [notesSaveState, setNotesSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [addBranchParent, setAddBranchParent] = useState<Clinic | null>(null);

  // Expand/collapse state for parent clinic rows (persisted per session)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.sessionStorage.getItem("clinics:expandedParents");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });
  const toggleParentExpanded = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { window.sessionStorage.setItem("clinics:expandedParents", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Bulk CSV
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bold Patients contract modal
  const [showBoldModal, setShowBoldModal] = useState(false);
  const [boldClinicName, setBoldClinicName] = useState("");
  const [boldClinicAddress, setBoldClinicAddress] = useState("");
  const [boldDate, setBoldDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [boldPackName, setBoldPackName] = useState("");
  const [boldShows, setBoldShows] = useState("");
  const [boldPerShowFee, setBoldPerShowFee] = useState("800");
  const [boldClientName, setBoldClientName] = useState("");
  const [boldClientEmail, setBoldClientEmail] = useState("");
  const [boldSending, setBoldSending] = useState(false);
  const [boldStatus, setBoldStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const sendBoldContractFn = useServerFn(sendBoldContractEmail);

  const boldShowsNum = parseInt(boldShows.replace(/[^0-9]/g, "")) || 0;
  const boldPerShowFeeNum = parseInt(boldPerShowFee.replace(/[^0-9]/g, "")) || 0;
  const boldTotalExGst = boldShowsNum * boldPerShowFeeNum;
  const boldGstAmount = Math.round(boldTotalExGst * 0.1);
  const boldTotalIncGst = boldTotalExGst + boldGstAmount;
  const boldValid =
    boldClinicName.trim() &&
    boldPackName.trim() &&
    boldShowsNum > 0 &&
    boldPerShowFeeNum > 0 &&
    boldClientName.trim() &&
    /^\S+@\S+\.\S+$/.test(boldClientEmail.trim());

  const openBoldModal = () => {
    if (!selectedClinic) return;
    setBoldClinicName(selectedClinic.clinic_name || "");
    const addr = [selectedClinic.city, selectedClinic.state].filter(Boolean).join(", ");
    setBoldClinicAddress(addr);
    setBoldDate(new Date().toISOString().slice(0, 10));
    setBoldPackName("");
    setBoldShows("");
    setBoldPerShowFee("800");
    setBoldClientName(selectedClinic.owner_name || "");
    setBoldClientEmail(selectedClinic.email || "");
    setBoldStatus(null);
    setShowBoldModal(true);
  };

  const handleSendBoldContract = async () => {
    if (!boldValid || !selectedClinic) return;
    setBoldSending(true);
    setBoldStatus(null);
    try {
      const agreementDate = new Date(boldDate + "T00:00:00").toLocaleDateString("en-AU");
      const result = await sendBoldContractFn({
        data: {
          to: boldClientEmail.trim(),
          clinicName: boldClinicName.trim(),
          clinicAddress: boldClinicAddress.trim(),
          contactName: boldClientName.trim(),
          packName: boldPackName.trim(),
          shows: boldShowsNum,
          perShowFee: boldPerShowFeeNum,
          totalExGst: boldTotalExGst,
          gstAmount: boldGstAmount,
          totalIncGst: boldTotalIncGst,
          agreementDate,
        },
      });
      if (result.success) {
        setBoldStatus({
          type: "success",
          message: `Bold Patients contract sent to ${boldClinicName.trim()}`,
        });
        setTimeout(() => setShowBoldModal(false), 1800);
      } else {
        setBoldStatus({ type: "error", message: result.error || "Something went wrong — please try again." });
      }
    } catch {
      setBoldStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setBoldSending(false);
  };

  // Call (browser-based via Twilio Voice SDK)
  const [callingId, setCallingId] = useState<string | null>(null);
  const { status: deviceStatus, call: deviceCall, hangup: deviceHangup } = useTwilioDevice(true);
  const myRepId = useCurrentRepId();

  // NOTE: AI auto-call review now lives in the global CallReviewInbox (top-right
  // bell icon in the dashboard chrome). The clinics page no longer owns the
  // pending-review state or the live processing banner — multiple calls can
  // stack up in the inbox and Peter works through them one by one.


  // Last contact per clinic
  const [lastContacts, setLastContacts] = useState<Record<string, ClinicContact>>({});

  // Set of clinic ids that had at least one call today (for the row dot — fix #7)
  const [calledTodayIds, setCalledTodayIds] = useState<Set<string>>(new Set());


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

  // Pull today's call_records and surface a coloured dot on each row that had
  // any call activity today (fix #7).
  const loadCalledToday = useCallback(async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("call_records")
      .select("clinic_id")
      .gte("called_at", startOfDay.toISOString());
    if (data) {
      const set = new Set<string>();
      for (const r of data as { clinic_id: string | null }[]) {
        if (r.clinic_id) set.add(r.clinic_id);
      }
      setCalledTodayIds((prev) => {
        const next = new Set(prev);
        for (const id of set) next.add(id);
        return next;
      });
    }
  }, []);

  useEffect(() => { loadClinics(); loadLastContacts(); loadCalledToday(); }, [loadClinics, loadLastContacts, loadCalledToday]);

  // Patch a single clinic row in place — never re-sort the whole list (fix #9).
  const patchClinicRow = useCallback(async (clinicId: string) => {
    const { data } = await supabase.from("clinics").select("*").eq("id", clinicId).maybeSingle();
    if (!data) return;
    setClinics((prev) => {
      const idx = prev.findIndex((c) => c.id === clinicId);
      if (idx === -1) return [data as Clinic, ...prev];
      const copy = [...prev];
      copy[idx] = data as Clinic;
      return copy;
    });
  }, []);

  // Realtime — only patch the changed row, never reload the whole list (fix #9).
  useEffect(() => {
    const channel = supabase
      .channel("clinics_page_refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_contacts" },
        () => {
          loadLastContacts();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clinics" },
        (payload) => {
          const row = payload.new as { id?: string } | undefined;
          if (row?.id) void patchClinicRow(row.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_records" },
        (payload) => {
          const row = payload.new as { clinic_id?: string | null } | undefined;
          if (row?.clinic_id) {
            setCalledTodayIds((prev) => {
              if (prev.has(row.clinic_id!)) return prev;
              const next = new Set(prev);
              next.add(row.clinic_id!);
              return next;
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadLastContacts, patchClinicRow]);

  // Fix #4 — listen for the AI review popup applying changes and patch local
  // CRM state instantly (no refetch needed).
  useEffect(() => {
    const onApplied = (e: Event) => {
      const detail = (e as CustomEvent<AppliedReview>).detail;
      if (!detail || !detail.clinicId) return;
      setClinics((prev) =>
        prev.map((c) =>
          c.id === detail.clinicId
            ? {
                ...c,
                status: detail.stage || c.status,
                next_follow_up: detail.followUpDate ?? c.next_follow_up,
                owner_name: detail.ownerName ?? c.owner_name,
              }
            : c,
        ),
      );
      // Refresh the latest-contact map so the new note + next-action surfaces
      // in the row immediately.
      loadLastContacts();
    };
    window.addEventListener("clinic-ai-applied", onApplied as EventListener);
    return () => window.removeEventListener("clinic-ai-applied", onApplied as EventListener);
  }, [loadLastContacts]);




  // (Escape key handler is registered further down, after flushPendingNotes
  // is declared, so it can flush any pending notes save before closing.)

  // Notify global chrome (no longer used — bell now lives in this page's
  // toolbar — but kept harmless if other components ever want to listen).
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("clinic-detail-panel", {
        detail: { open: !!selectedClinic },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("clinic-detail-panel", { detail: { open: false } }),
      );
    };
  }, [selectedClinic]);


  const loadContacts = async (clinicId: string) => {
    const { data } = await supabase.from("clinic_contacts").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false });
    if (data) setContacts(data as ClinicContact[]);
  };

  // Immediately persist any pending notes edit. Safe to call multiple times.
  const flushPendingNotes = useCallback(async () => {
    if (notesTimer.current) {
      clearTimeout(notesTimer.current);
      notesTimer.current = null;
    }
    const pendingValue = pendingNotesRef.current;
    const pendingClinic = pendingClinicIdRef.current;
    if (pendingValue === null || !pendingClinic) return;
    pendingNotesRef.current = null;
    pendingClinicIdRef.current = null;
    setNotesSaveState("saving");
    const valueToWrite = pendingValue === "" ? null : pendingValue;
    await supabase.from("clinics").update({ notes: valueToWrite }).eq("id", pendingClinic);
    setClinics((prev) => prev.map((c) => c.id === pendingClinic ? { ...c, notes: valueToWrite } : c));
    setSelectedClinic((prev) => prev && prev.id === pendingClinic ? { ...prev, notes: valueToWrite } : prev);
    setNotesSaveState("saved");
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    savedFlashTimer.current = setTimeout(() => setNotesSaveState("idle"), 1500);
  }, []);

  const openDetail = useCallback((clinic: Clinic) => {
    // Flush any unsaved notes from the previously open clinic before swapping.
    void flushPendingNotes();
    setSelectedClinic(clinic);
    setEditNotes(clinic.notes || "");
    setEditOwner(clinic.owner_name || "");
    setEditPhone(clinic.phone || "");
    setEditEmail(clinic.email || "");
    setEditStatus(clinic.status);
    setEditFollowUp(clinic.next_follow_up || "");
    setNotesSaveState("idle");
    loadContacts(clinic.id);
  }, [flushPendingNotes]);

  const closeDetail = useCallback(() => {
    void flushPendingNotes();
    setSelectedClinic(null);
  }, [flushPendingNotes]);

  // Escape key dismisses the side panel (and flushes any pending notes save first).
  useEffect(() => {
    if (!selectedClinic) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClinic, closeDetail]);

  // Flush on tab close / refresh / navigation away.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (pendingNotesRef.current !== null && pendingClinicIdRef.current) {
        void flushPendingNotes();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushPendingNotes();
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    };
  }, [flushPendingNotes]);

  // Auto-open the clinic detail panel when ?clinic=<id> is in the URL.
  // This lets the dashboard activity items deep-link straight into a clinic.
  const routeSearch = routeApi.useSearch();
  useEffect(() => {
    if (!routeSearch.clinic || clinics.length === 0) return;
    const target = clinics.find((c) => c.id === routeSearch.clinic);
    if (target && (!selectedClinic || selectedClinic.id !== target.id)) {
      openDetail(target);
      const url = new URL(window.location.href);
      url.searchParams.delete("clinic");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [routeSearch.clinic, clinics, selectedClinic, openDetail]);

  const updateClinicField = async (field: keyof Clinic, value: string | boolean) => {
    if (!selectedClinic) return;
    const updateData = { [field]: value === "" ? null : value } as any;
    await supabase.from("clinics").update(updateData).eq("id", selectedClinic.id);
    setClinics((prev) => prev.map((c) => c.id === selectedClinic.id ? { ...c, [field]: value === "" ? null : value } as any : c));
    setSelectedClinic((prev) => prev ? { ...prev, [field]: value === "" ? null : value } as any : prev);
  };

  const handleNotesChange = (val: string) => {
    if (!selectedClinic) return;
    setEditNotes(val);
    pendingNotesRef.current = val;
    pendingClinicIdRef.current = selectedClinic.id;
    setNotesSaveState("saving");
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void flushPendingNotes();
    }, 300);
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
    let newStage = OUTCOME_TO_STAGE[logOutcome];
    // Special case: "Sent" outcome under Email or Loom → Sent Email/Loom stage
    if ((logType === "Email" || logType === "Loom") && logOutcome === "Sent") {
      newStage = "Sent Email/Loom";
    }
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
    logOutcome === "Spoke — Zoom Set";

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
      parent_clinic_id: addBranchParent?.id ?? null,
    });
    setShowAddModal(false);
    setAddBranchParent(null);
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
    setCallingId(clinic.id);
    try {
      setCalledTodayIds((prev) => {
        if (prev.has(clinic.id)) return prev;
        const next = new Set(prev);
        next.add(clinic.id);
        return next;
      });
      await deviceCall(clinic.phone, { clinicId: clinic.id, ...(myRepId ? { repId: myRepId } : {}) });
    } catch (err) {
      console.error("Call failed:", err);
      setCallingId(null);
      void loadCalledToday();
      toast.error(err instanceof Error ? err.message : "Could not start call");
    }
  };

  // Reset callingId when call ends
  useEffect(() => {
    if (deviceStatus === "ready" && callingId) {
      setCallingId(null);
    }
  }, [deviceStatus, callingId]);

  // Filtering — a row passes if it matches itself, OR (it's a parent and one of its children matches)
  const q = search.toLowerCase();
  const rowMatchesSelf = (c: Clinic) => {
    const matchSearch = !q || c.clinic_name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    const matchState = !filterState || c.state === filterState;
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchState && matchStatus;
  };
  const childrenByParent: Record<string, Clinic[]> = {};
  for (const c of clinics) {
    if (c.parent_clinic_id) (childrenByParent[c.parent_clinic_id] ||= []).push(c);
  }
  // Hide Signed clinics from the CRM list unless the user explicitly filters by Signed
  const hideSigned = filterStatus !== "Signed";
  const filtered = clinics.filter((c) => {
    if (hideSigned && c.status === "Signed") return false;
    if (rowMatchesSelf(c)) return true;
    if (c.is_parent && (childrenByParent[c.id] || []).some(rowMatchesSelf)) return true;
    return false;
  });
  // Auto-expand parents when a child matches search/filter
  const autoExpandedParents = new Set<string>();
  if (q || filterState || filterStatus) {
    for (const c of clinics) {
      if (c.parent_clinic_id && rowMatchesSelf(c)) autoExpandedParents.add(c.parent_clinic_id);
    }
  }
  const isParentExpanded = (id: string) => expandedParents.has(id) || autoExpandedParents.has(id);

  // Split active vs not-applicable, then group active by state
  const activeFiltered = filtered.filter((c) => !NOT_APPLICABLE_STAGES.has(c.status));
  const notApplicableFiltered = filtered.filter((c) => NOT_APPLICABLE_STAGES.has(c.status));
  const grouped: Record<string, Clinic[]> = {};
  for (const c of activeFiltered) {
    const st = c.state || "Unknown";
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(c);
  }
  // Within each state: top-level rows = those without a parent in the same filtered set;
  // children render under their parent when expanded.
  const filteredIds = new Set(activeFiltered.map((c) => c.id));
  for (const st of Object.keys(grouped)) {
    const all = grouped[st];
    const topLevel = all.filter((c) => !c.parent_clinic_id || !filteredIds.has(c.parent_clinic_id));
    const childrenInState: Record<string, Clinic[]> = {};
    for (const c of all) {
      if (c.parent_clinic_id && filteredIds.has(c.parent_clinic_id)) {
        (childrenInState[c.parent_clinic_id] ||= []).push(c);
      }
    }
    // flatten: parent followed by its expanded children
    const out: Array<Clinic & { __indent?: boolean }> = [];
    for (const c of topLevel) {
      out.push(c);
      if (c.is_parent && isParentExpanded(c.id)) {
        for (const ch of childrenInState[c.id] || []) out.push({ ...ch, __indent: true });
      }
    }
    grouped[st] = out;
  }
  const stateOrder = [...STATES, "Unknown"];
  const sortedStates = stateOrder.filter((s) => grouped[s]?.length);
  const [naCollapsed, setNaCollapsed] = [collapsedStates["__NA__"] !== false, (v: boolean) => setCollapsedStates((p) => ({ ...p, __NA__: !v }))];

  const toggleState = (state: string) => {
    setCollapsedStates((prev) => ({ ...prev, [state]: !prev[state] }));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#111111" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#f7f7f5" }}>

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-5 py-3" style={{ borderBottom: "1px solid #f9f9f9" }}>
        <div className="relative w-full md:flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#111111" }} />
          <Input
            placeholder="Search clinics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-0 text-sm w-full"
            style={{ background: "#f9f9f9", color: "#111111", height: 36 }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <FilterDropdown label="State" options={STATES} value={filterState} onChange={setFilterState} />
          <FilterDropdown label="Stage" options={[...PIPELINE_STAGES]} value={filterStatus} onChange={setFilterStatus} />
          <Button onClick={() => setShowAddModal(true)} size="sm" className="border-0 text-xs" style={{ background: "#f4522d", color: "#111111" }}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            size="sm"
            variant="ghost"
            className="text-xs h-9 w-9 p-0"
            style={{ color: "#111111" }}
            title={importing ? "Importing..." : "Bulk Upload CSV"}
            aria-label="Bulk Upload CSV"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          </Button>
          <CallReviewInbox />
          <span className="text-xs ml-auto" style={{ color: "#111111" }}>
            {activeFiltered.length} active{notApplicableFiltered.length > 0 && ` · ${notApplicableFiltered.length} N/A`}
          </span>
        </div>
      </div>

      {/* Tabs: List + Pipeline */}
      <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 self-start">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          
        </TabsList>

        <TabsContent value="list" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
      {/* Table */}
      <div className="flex-1 overflow-y-auto h-full">

        <div
          className="hidden md:flex items-center sticky top-0 z-10"
          style={{ background: "#f4f3ee", borderBottom: "1px solid #111", height: 28 }}
        >
          <span className="w-4 shrink-0" />
          {([
            ["name", "CLINIC"],
            ["city", "CITY"],
            ["phone", "PHONE"],
            ["note", "LATEST NOTE"],
            ["stage", "STAGE"],
          ] as Array<[ColKey, string]>).map(([key, label]) => (
            <div
              key={key}
              className="shrink-0 px-2 relative h-full flex items-center"
              style={{ width: colWidths[key] }}
            >
              <span className="text-[9px] font-bold uppercase truncate" style={{ color: "#111111", letterSpacing: "0.1em" }}>{label}</span>
              <div
                onMouseDown={startResize(key)}
                className="absolute -right-1 top-0 h-full w-2 cursor-col-resize group flex items-center justify-center z-20"
                title="Drag to resize"
              >
                <span className="block h-3 w-px bg-[#c9c5b8] group-hover:bg-[#f4522d] group-hover:w-0.5" />
              </div>
            </div>
          ))}
          <div className="flex-1 min-w-0 px-2 h-full flex items-center">
            <span className="text-[9px] font-bold uppercase truncate" style={{ color: "#111111", letterSpacing: "0.1em" }}>NEXT ACTION</span>
          </div>
          <div className="shrink-0 px-2 h-full flex items-center relative" style={{ width: colWidths.actions }}>
            <span className="text-[9px] font-bold uppercase truncate" style={{ color: "#111111", letterSpacing: "0.1em" }}>ACTIONS</span>
            <div
              onMouseDown={startResize("actions")}
              className="absolute -left-1 top-0 h-full w-2 cursor-col-resize group flex items-center justify-center z-20"
              title="Drag to resize"
            >
              <span className="block h-3 w-px bg-[#c9c5b8] group-hover:bg-[#f4522d] group-hover:w-0.5" />
            </div>
          </div>
        </div>

        {sortedStates.map((state) => {
          const isCollapsed = collapsedStates[state] !== false;
          const stateClinics = grouped[state];
          const abbr = STATES_ABBR[state] || state;
          return (
            <div key={state}>
              <button
                onClick={() => toggleState(state)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: "1px solid #f9f9f9" }}
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" style={{ color: "#111111" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "#111111" }} />}
                <span className="text-xs font-semibold" style={{ color: "#f4522d", letterSpacing: "0.1em" }}>{abbr}</span>
                <span className="text-[10px]" style={{ color: "#111111" }}>({stateClinics.length})</span>
              </button>
              {!isCollapsed && (
                <div>
                  {stateClinics.map((c) => {
                    const sc = STAGE_COLORS[c.status] || STAGE_COLORS["Not Started"];
                    const nextAction = getNextActionText(c, lastContacts[c.id] || null);
                    const lastCt = lastContacts[c.id];
                    const notePreview = truncateNote(lastCt?.notes || lastCt?.outcome);
                    const calledToday = calledTodayIds.has(c.id);
                    const phoneInvalid = !!c.phone && !isValidAUPhone(c.phone);

                    const isChild = !!(c as Clinic & { __indent?: boolean }).__indent;
                    const isParentRow = c.is_parent;
                    const childCount = isParentRow ? (childrenByParent[c.id]?.length || 0) : 0;
                    const isNotInterested = c.status === "Contacted — Not Interested";
                    const isZoomSet = c.status === "Zoom Set";
                    const showCallbackDetail = false;
                    const fullLastNote = "";
                    const rowBg = isChild
                      ? "#fbfaf7"
                      : isNotInterested
                        ? "#fde2e2"
                        : isZoomSet
                          ? "#dcfce7"
                          : undefined;
                    return (
                      <div key={c.id}>
                      {/* Desktop row */}
                      <div
                        className="hidden md:flex items-center hover:bg-white/[0.02] transition-colors relative"
                        style={{
                          height: 44,
                          borderBottom: "1px solid #111",
                          paddingLeft: isChild ? 24 : 0,
                          background: rowBg,
                          borderLeft: isParentRow ? "3px solid #f4522d" : undefined,
                        }}
                      >
                        {/* Today-called dot (fix #7) */}
                        {calledToday && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                            style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.7)" }}
                            title="Called today"
                          />
                        )}
                        {/* Expand/collapse caret for parent rows */}
                        {isParentRow ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleParentExpanded(c.id); }}
                            className="ml-1 mr-0.5 p-0.5 rounded hover:bg-[#f0ede5]"
                            title={isParentExpanded(c.id) ? "Collapse branches" : "Expand branches"}
                          >
                            {isParentExpanded(c.id)
                              ? <ChevronDown className="w-3 h-3" style={{ color: "#f4522d" }} />
                              : <ChevronRight className="w-3 h-3" style={{ color: "#f4522d" }} />}
                          </button>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        {/* Clinic Name */}
                        <div className="shrink-0 px-2 truncate" style={{ width: colWidths.name }}>
                          <button onClick={() => openDetail(c)} className={`text-left hover:underline truncate block text-xs ${isParentRow ? "font-extrabold" : "font-semibold"}`} style={{ color: "#111111" }}>
                            {c.clinic_name}
                            {isParentRow && childCount > 0 && (
                              <span className="ml-1 text-[10px] font-normal" style={{ color: "#9a9a9a" }}>({childCount})</span>
                            )}
                          </button>
                        </div>
                        {/* City */}
                        <div className="shrink-0 px-2 truncate text-[11px]" style={{ width: colWidths.city, color: "#111111" }}>{c.city || "—"}</div>
                        {/* Phone */}
                        <div className="shrink-0 px-2" style={{ width: colWidths.phone }}>
                          {c.phone ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCall(c)}
                                disabled={phoneInvalid}
                                className="flex items-center gap-1 text-[11px] hover:underline transition disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ color: phoneInvalid ? "#111111" : "#888" }}
                                title={phoneInvalid ? "Invalid Australian phone number — cannot dial" : "Call"}
                              >
                                {callingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3 shrink-0" style={{ color: phoneInvalid ? "#111111" : "#bbb" }} />}
                                <span className="truncate">{c.phone}</span>
                              </button>
                              {phoneInvalid && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded uppercase"
                                  style={{ background: "#fef2f2", color: "#f87171" }}
                                  title="Phone number cannot be dialled"
                                >
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Bad
                                </span>
                              )}
                            </div>
                          ) : <span style={{ color: "#111111" }} className="text-[11px]">—</span>}
                        </div>
                        {/* Latest Note */}
                        <div className="shrink-0 px-2 truncate text-[11px]" style={{ width: colWidths.note, color: notePreview ? "#111111" : "#111111" }} title={lastCt?.notes || lastCt?.outcome || ""}>
                          {notePreview || "—"}
                        </div>
                        {/* Stage */}
                        <div className="shrink-0 px-2" style={{ width: colWidths.stage }}>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap" style={{ background: sc.bg, color: sc.text }}>
                            {c.status === "Not Started" ? "Not Started" : c.status.replace("Contacted — ", "")}
                          </span>
                        </div>
                        {/* Next Action */}
                        <div className="flex-1 min-w-0 px-2 truncate text-[11px]" style={{ color: nextAction.overdue ? "#ef4444" : "#111111" }}>
                          {nextAction.text}
                        </div>
                        {/* Actions */}
                        <div className="shrink-0 px-2 flex items-center gap-0.5" style={{ width: colWidths.actions }}>
                          {c.phone && !phoneInvalid && (
                            <button onClick={() => handleCall(c)} className="p-1 rounded hover:bg-[#f9f9f9]" title="Call">
                              <PhoneCall className="w-3 h-3" style={{ color: "#22c55e" }} />
                            </button>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="p-1 rounded hover:bg-[#f9f9f9]" title="Email">
                              <Mail className="w-3 h-3" style={{ color: "#60a5fa" }} />
                            </a>
                          )}
                          <button onClick={() => { openDetail(c); setTimeout(openLogModal, 100); }} className="p-1 rounded hover:bg-[#f9f9f9]" title="Log">
                            <MessageSquare className="w-3 h-3" style={{ color: "#a855f7" }} />
                          </button>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div
                        className="md:hidden relative"
                        style={{
                          borderBottom: "1px solid #e5e5e5",
                          paddingLeft: isChild ? 16 : 0,
                          background: rowBg,
                          borderLeft: isParentRow ? "3px solid #f4522d" : undefined,
                        }}
                      >
                        {calledToday && (
                          <span
                            className="absolute left-1 top-3 w-1.5 h-1.5 rounded-full"
                            style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.7)" }}
                            title="Called today"
                          />
                        )}
                        <div className="px-3 py-3">
                          <div className="flex items-start gap-2 mb-1.5">
                            {isParentRow && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleParentExpanded(c.id); }}
                                className="mt-0.5 p-0.5 rounded hover:bg-[#f0ede5] shrink-0"
                                aria-label={isParentExpanded(c.id) ? "Collapse" : "Expand"}
                              >
                                {isParentExpanded(c.id)
                                  ? <ChevronDown className="w-4 h-4" style={{ color: "#f4522d" }} />
                                  : <ChevronRight className="w-4 h-4" style={{ color: "#f4522d" }} />}
                              </button>
                            )}
                            <button
                              onClick={() => openDetail(c)}
                              className={`flex-1 min-w-0 text-left ${isParentRow ? "font-extrabold" : "font-semibold"}`}
                              style={{ color: "#111111" }}
                            >
                              <div className="text-sm leading-tight break-words">
                                {c.clinic_name}
                                {isParentRow && childCount > 0 && (
                                  <span className="ml-1 text-[11px] font-normal" style={{ color: "#9a9a9a" }}>({childCount})</span>
                                )}
                              </div>
                              {c.city && (
                                <div className="text-[11px] mt-0.5" style={{ color: "#6b6b6b" }}>{c.city}</div>
                              )}
                            </button>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap shrink-0" style={{ background: sc.bg, color: sc.text }}>
                              {c.status === "Not Started" ? "Not Started" : c.status.replace("Contacted — ", "")}
                            </span>
                          </div>

                          {notePreview && (
                            <div className="text-[11px] mb-1.5 line-clamp-2" style={{ color: "#444" }}>
                              {notePreview}
                            </div>
                          )}

                          {nextAction.text !== "—" && (
                            <div className="text-[11px] mb-2 truncate" style={{ color: nextAction.overdue ? "#ef4444" : "#6b6b6b" }}>
                              {nextAction.text}
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {c.phone && !phoneInvalid && (
                              <button
                                onClick={() => handleCall(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                                style={{ background: "#dcfce7", color: "#166534" }}
                              >
                                {callingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                                Call
                              </button>
                            )}
                            {c.phone && phoneInvalid && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase"
                                style={{ background: "#fef2f2", color: "#f87171" }}
                              >
                                <AlertCircle className="w-3 h-3" /> Bad number
                              </span>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                                style={{ background: "#dbeafe", color: "#1e40af" }}
                              >
                                <Mail className="w-3.5 h-3.5" /> Email
                              </a>
                            )}
                            <button
                              onClick={() => { openDetail(c); setTimeout(openLogModal, 100); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                              style={{ background: "#f3e8ff", color: "#6b21a8" }}
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Log
                            </button>
                            <button
                              onClick={() => openDetail(c)}
                              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                              style={{ background: "#111", color: "#fff" }}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      </div>

                      {showCallbackDetail && (
                        <div
                          className="px-3 md:px-4 py-2 text-[11px] leading-relaxed"
                          style={{
                            background: "#fff7ed",
                            borderBottom: "1px solid #111",
                            color: "#111111",
                            paddingLeft: isChild ? 40 : 16,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#f4522d" }}>
                              Last convo {lastCt?.created_at ? `· ${formatDateTime(lastCt.created_at)} (${relativeTime(lastCt.created_at)})` : ""}
                            </span>
                            {lastCt?.contact_type && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#fed7aa", color: "#9a3412" }}>
                                {lastCt.contact_type}
                              </span>
                            )}
                            {lastCt?.outcome && (
                              <span className="text-[9px]" style={{ color: "#6b6b6b" }}>{lastCt.outcome}</span>
                            )}
                            {lastCt?.duration && (
                              <span className="text-[9px]" style={{ color: "#6b6b6b" }}>· {lastCt.duration}</span>
                            )}
                          </div>
                          <div style={{ whiteSpace: "pre-wrap", color: "#111111" }}>{fullLastNote}</div>
                          {lastCt?.next_action && (
                            <div className="mt-1 text-[10px]" style={{ color: "#9a3412" }}>
                              <span className="font-semibold">Next: </span>{lastCt.next_action}
                              {lastCt.next_action_date ? ` — ${lastCt.next_action_date}${lastCt.next_action_time ? ` ${lastCt.next_action_time}` : ""}` : ""}
                            </div>
                          )}
                        </div>
                      )}
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
              style={{ borderBottom: "1px solid #f9f9f9" }}
            >
              {naCollapsed ? <ChevronRight className="w-3 h-3" style={{ color: "#111111" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "#111111" }} />}
              <span className="text-xs font-semibold" style={{ color: "#111111", letterSpacing: "0.1em" }}>NOT APPLICABLE</span>
              <span className="text-[10px]" style={{ color: "#111111" }}>({notApplicableFiltered.length})</span>
            </button>
            {!naCollapsed && (
              <div>
                {notApplicableFiltered.map((c) => {
                  const sc = STAGE_COLORS[c.status] || STAGE_COLORS["Not Started"];
                  const lastCt = lastContacts[c.id];
                  const notePreview = truncateNote(lastCt?.notes || lastCt?.outcome);
                   return (
                     <div key={c.id}>
                     {/* Desktop */}
                     <div
                       className="hidden md:flex items-center hover:bg-white/[0.02] transition-colors opacity-60"
                       style={{ height: 44, borderBottom: "1px solid #111" }}
                     >
                       <div className="shrink-0 px-3 truncate" style={{ width: colWidths.name }}>
                         <button onClick={() => openDetail(c)} className="text-left hover:underline font-semibold truncate block text-xs" style={{ color: "#111111" }}>{c.clinic_name}</button>
                       </div>
                       <div className="shrink-0 px-2 truncate text-[11px]" style={{ width: colWidths.city, color: "#111111" }}>{c.city || "—"}</div>
                       <div className="shrink-0 px-2 text-[11px]" style={{ width: colWidths.phone, color: "#111111" }}>{c.phone || "—"}</div>
                       <div className="shrink-0 px-2 truncate text-[11px]" style={{ width: colWidths.note, color: "#111111" }} title={lastCt?.notes || lastCt?.outcome || ""}>{notePreview || "—"}</div>
                       <div className="shrink-0 px-2" style={{ width: colWidths.stage }}>
                         <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap" style={{ background: sc.bg, color: sc.text }}>N/A</span>
                       </div>
                       <div className="flex-1 min-w-0 px-2 truncate text-[11px]" style={{ color: "#111111" }}>—</div>
                       <div className="shrink-0 px-2" style={{ width: colWidths.actions }} />
                     </div>
                     {/* Mobile */}
                     <button
                       onClick={() => openDetail(c)}
                       className="md:hidden w-full text-left px-3 py-2.5 opacity-60"
                       style={{ borderBottom: "1px solid #e5e5e5" }}
                     >
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-semibold flex-1 truncate" style={{ color: "#111111" }}>{c.clinic_name}</span>
                         <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: sc.bg, color: sc.text }}>N/A</span>
                       </div>
                       {c.city && <div className="text-[11px] mt-0.5" style={{ color: "#6b6b6b" }}>{c.city}</div>}
                     </button>
                     </div>
                   );
                 })}
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: "#111111", fontSize: 13 }}>No clinics found.</div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="pipeline" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <PipelineBoard
            clinics={(() => {
              // Pipeline view: ONE CARD PER CHAIN. Show only flagships (top-level rows with no parent).
              // Branches are surfaced inside the flagship's card so the rep can see which
              // number belongs to which branch and call any of them directly.
              const branchesByParent: Record<string, Clinic[]> = {};
              for (const c of clinics) {
                if (c.parent_clinic_id) {
                  (branchesByParent[c.parent_clinic_id] ||= []).push(c);
                }
              }
              return clinics
                .filter((c) => !c.parent_clinic_id)
                .filter((c) => {
                  const matchSearch = !q || c.clinic_name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
                  const matchState = !filterState || c.state === filterState;
                  const matchStatus = !filterStatus || c.status === filterStatus;
                  return matchSearch && matchState && matchStatus;
                })
                .map((c) => ({
                  ...c,
                  _branches: (branchesByParent[c.id] || []).slice().sort((a, b) => a.clinic_name.localeCompare(b.clinic_name)),
                } as Clinic & { _branches?: Clinic[] }));
            })()}
            onOpenDetail={openDetail}
            onCall={handleCall}
            callingId={callingId}
            onMoveStage={async (clinic, newStage) => {
              const prevStage = clinic.status;
              setClinics((prev) => prev.map((c) => c.id === clinic.id ? { ...c, status: newStage } : c));
              setSelectedClinic((prev) => prev && prev.id === clinic.id ? { ...prev, status: newStage } : prev);
              const { error } = await supabase.from("clinics").update({ status: newStage }).eq("id", clinic.id);
              if (error) {
                setClinics((prev) => prev.map((c) => c.id === clinic.id ? { ...c, status: prevStage } : c));
                setSelectedClinic((prev) => prev && prev.id === clinic.id ? { ...prev, status: prevStage } : prev);
                toast.error("Failed to move clinic");
              }
            }}
          />
        </TabsContent>

      </Tabs>



      {/* Detail Panel */}
      {selectedClinic && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={closeDetail}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md h-full overflow-y-auto"
            style={{ background: "#f7f7f5", borderLeft: "1px solid #ebebeb" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              {/* Close button */}
              <div className="flex justify-end">
                <button onClick={closeDetail} className="p-1 rounded hover:bg-[#f9f9f9]">
                  <X className="w-4 h-4" style={{ color: "#111111" }} />
                </button>
              </div>

              {/* ===== SECTION 1: CLINIC INFO ===== */}
              <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #ebebeb" }}>
                <div className="text-[10px] uppercase font-bold mb-3" style={{ color: "#f4522d", letterSpacing: "0.15em" }}>CLINIC INFO</div>

                <h2 className="text-lg font-bold mb-1" style={{ color: "#111111" }}>{selectedClinic.clinic_name}</h2>
                <p className="text-xs mb-1" style={{ color: "#111111" }}>
                  {selectedClinic.city && `${selectedClinic.city}, `}{selectedClinic.state}
                </p>
                {selectedClinic.website && (
                  <a href={selectedClinic.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mb-3 text-xs hover:underline" style={{ color: "#f4522d" }}>
                    <ExternalLink className="w-3 h-3" /> Website
                  </a>
                )}

                {/* NEXT ACTION banner */}
                {(() => {
                  const action = getNextActionText(selectedClinic, contacts[0] || null);
                  if (action.text === "—") return null;
                  return (
                    <div className="rounded-lg p-3 mb-3 flex items-center gap-2" style={{ background: action.overdue ? "#fffbeb" : "#eff6ff", border: `1px solid ${action.overdue ? "#92400e" : "#3b82f6"}` }}>
                      <Clock className="w-4 h-4 shrink-0" style={{ color: action.overdue ? "#f59e0b" : "#60a5fa" }} />
                      <div>
                        <div className="text-[10px] uppercase font-bold" style={{ color: action.overdue ? "#f59e0b" : "#60a5fa", letterSpacing: "0.1em" }}>NEXT ACTION</div>
                        <div className="text-xs font-medium" style={{ color: "#111111" }}>{action.text}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <FieldRow label="Owner">
                    <Input value={editOwner} onChange={(e) => setEditOwner(e.target.value)} onBlur={() => updateClinicField("owner_name", editOwner)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                  </FieldRow>
                  <FieldRow label="Phone">
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} onBlur={() => updateClinicField("phone", editPhone)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                  </FieldRow>
                  <FieldRow label="Email">
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} onBlur={() => updateClinicField("email", editEmail)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                  </FieldRow>
                  <FieldRow label="Stage">
                    <select value={editStatus} onChange={(e) => { setEditStatus(e.target.value); updateClinicField("status", e.target.value); }} className="w-full rounded px-2 py-1 text-xs border-0" style={{ background: "#f9f9f9", color: "#111111" }}>
                      {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Follow Up">
                    <Input type="date" value={editFollowUp} onChange={(e) => { setEditFollowUp(e.target.value); updateClinicField("next_follow_up", e.target.value); }} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                  </FieldRow>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] uppercase font-semibold" style={{ color: "#111111", letterSpacing: "0.12em" }}>Notes</div>
                      <div className="text-[10px] font-medium" style={{ color: notesSaveState === "saved" ? "#10b981" : notesSaveState === "saving" ? "#f59e0b" : "transparent", transition: "color 200ms" }}>
                        {notesSaveState === "saving" ? "Saving…" : notesSaveState === "saved" ? "Saved" : "—"}
                      </div>
                    </div>
                    <Textarea value={editNotes} onChange={(e) => handleNotesChange(e.target.value)} onBlur={() => { void flushPendingNotes(); }} rows={3} className="border-0 text-xs resize-none" style={{ background: "#f9f9f9", color: "#111111" }} placeholder="Add notes..." />
                  </div>
                </div>
              </div>

              {/* ===== SECTION 2: LOG ACTIVITY ===== */}
              <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #ebebeb" }}>
                <div className="text-[10px] uppercase font-bold mb-3" style={{ color: "#f4522d", letterSpacing: "0.15em" }}>LOG ACTIVITY</div>
                <Button onClick={openLogModal} className="w-full border-0 text-xs font-semibold" style={{ background: "#f4522d", color: "#111111" }}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Log Activity
                </Button>
                <Button
                  onClick={openBoldModal}
                  className="w-full border-0 text-xs font-semibold mt-2"
                  style={{ background: "#f4522d", color: "#111111" }}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Send Bold Contract
                </Button>
              </div>

              {/* ===== LATEST SMS ===== */}
              <ClinicSmsPreview clinicId={selectedClinic.id} clinicPhone={selectedClinic.phone} />

              {/* ===== SECTION 3: ACTIVITY TIMELINE ===== */}
              <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #ebebeb" }}>
                <div className="text-[10px] uppercase font-bold mb-3" style={{ color: "#f4522d", letterSpacing: "0.15em" }}>ACTIVITY TIMELINE</div>
                {contacts.length === 0 ? (
                  <p className="text-xs" style={{ color: "#111111" }}>No activity logged yet.</p>
                ) : (
                  <div className="relative pl-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: "#111111" }} />
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
          <div className="relative rounded-lg p-5 w-full max-w-sm mx-3 max-h-[90vh] overflow-y-auto" style={{ background: "#ffffff", border: "1px solid #ebebeb" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "#111111" }}>Log Activity — {selectedClinic.clinic_name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Contact Type</label>
                <select value={logType} onChange={(e) => handleTypeChange(e.target.value)} className="w-full rounded px-2 py-1.5 text-xs border-0" style={{ background: "#f9f9f9", color: "#111111" }}>
                  {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Outcome</label>
                <select value={logOutcome} onChange={(e) => setLogOutcome(e.target.value)} className="w-full rounded px-2 py-1.5 text-xs border-0" style={{ background: "#f9f9f9", color: "#111111" }}>
                  {(OUTCOME_MAP[logType] || CALL_OUTCOMES).map((o) => <option key={o} value={o}>{outcomeLabel(o)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Notes</label>
                <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={2} className="border-0 text-xs resize-none" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              {needsDateTimePicker && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>
                      {logOutcome === "Spoke — Zoom Set" ? "Zoom Date" : "Call Back Date"}
                    </label>
                    <Input type="date" value={logNextDate} onChange={(e) => setLogNextDate(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Time</label>
                    <Input type="time" value={logNextTime} onChange={(e) => setLogNextTime(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Owner Name</label>
                <Input value={logOwnerName} onChange={(e) => setLogOwnerName(e.target.value)} placeholder="Clinic owner name" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleLogActivity} className="flex-1 border-0 text-xs" style={{ background: "#f4522d", color: "#111111" }}>Save</Button>
                <Button onClick={() => setShowLogModal(false)} variant="ghost" className="text-xs" style={{ color: "#111111" }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bold Patients Contract Modal */}
      {showBoldModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => !boldSending && setShowBoldModal(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative rounded-lg p-5 w-full max-w-md mx-3 max-h-[90vh] overflow-y-auto" style={{ background: "#ffffff", border: "1px solid #ebebeb" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base font-extrabold tracking-tight" style={{ color: "#111111" }}>BOLD</span>
              <span className="text-base font-extrabold tracking-tight" style={{ color: "#f4522d" }}>PATIENTS</span>
              <span className="ml-auto text-[10px] uppercase" style={{ color: "#111111", letterSpacing: "0.1em" }}>Send Contract</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Clinic Name</label>
                <Input value={boldClinicName} onChange={(e) => setBoldClinicName(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Clinic Address</label>
                <Input value={boldClinicAddress} onChange={(e) => setBoldClinicAddress(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Date</label>
                <Input type="date" value={boldDate} onChange={(e) => setBoldDate(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Pack Name</label>
                <Input value={boldPackName} onChange={(e) => setBoldPackName(e.target.value)} placeholder="e.g. Custom 5 Pack" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Number of Shows</label>
                  <Input type="number" min="0" value={boldShows} onChange={(e) => setBoldShows(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Per Show Fee ($)</label>
                  <Input type="number" min="0" value={boldPerShowFee} onChange={(e) => setBoldPerShowFee(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
                </div>
              </div>

              <div className="rounded-md p-3 space-y-1.5" style={{ background: "#ffffff", border: "1px solid #ebebeb" }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#111111" }}>Total exc GST</span>
                  <span className="font-semibold" style={{ color: "#111111" }}>${boldTotalExGst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#111111" }}>GST (10%)</span>
                  <span className="font-semibold" style={{ color: "#111111" }}>${boldGstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5" style={{ borderTop: "1px solid #ebebeb" }}>
                  <span className="font-bold" style={{ color: "#111111" }}>Total inc GST</span>
                  <span className="font-extrabold" style={{ color: "#f4522d" }}>${boldTotalIncGst.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Client Name</label>
                <Input value={boldClientName} onChange={(e) => setBoldClientName(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "#111111", letterSpacing: "0.1em" }}>Client Email</label>
                <Input type="email" value={boldClientEmail} onChange={(e) => setBoldClientEmail(e.target.value)} className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              </div>

              {boldStatus && (
                <div
                  className="rounded-md px-3 py-2 text-[11px] font-medium"
                  style={{
                    background: boldStatus.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(220,38,38,0.1)",
                    color: boldStatus.type === "success" ? "#10b981" : "#f87171",
                    border: `1px solid ${boldStatus.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.3)"}`,
                  }}
                >
                  {boldStatus.message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSendBoldContract}
                  disabled={!boldValid || boldSending}
                  className="flex-1 border-0 text-xs font-semibold"
                  style={{ background: "#f4522d", color: "#111111", opacity: !boldValid || boldSending ? 0.5 : 1 }}
                >
                  {boldSending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-3.5 h-3.5 mr-1.5" /> Send Contract</>
                  )}
                </Button>
                <Button onClick={() => setShowBoldModal(false)} disabled={boldSending} variant="ghost" className="text-xs" style={{ color: "#111111" }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Clinic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative rounded-lg p-5 w-full max-w-sm mx-3 max-h-[90vh] overflow-y-auto" style={{ background: "#ffffff", border: "1px solid #ebebeb" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "#111111" }}>Add Clinic</h3>
            <div className="space-y-3">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Clinic name *" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              <Input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="State" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} placeholder="Website" className="border-0 text-xs h-8" style={{ background: "#f9f9f9", color: "#111111" }} />
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAddClinic} className="flex-1 border-0 text-xs" style={{ background: "#f4522d", color: "#111111" }}>Add</Button>
                <Button onClick={() => setShowAddModal(false)} variant="ghost" className="text-xs" style={{ color: "#111111" }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI auto-call review now lives in the global CallReviewInbox (top-right). */}
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
      <div className="absolute -left-4 top-1 w-2 h-2 rounded-full" style={{ background: "#f4522d" }} />
      <div className="rounded-lg p-3" style={{ background: "#f9f9f9" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold" style={{ color: "#111111" }}>
            {emoji} {contact.contact_type}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "#111111" }}>{formatDateTime(contact.created_at)}</span>
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
          <div className="flex items-center gap-2 mb-1 p-1.5 rounded" style={{ background: "#ffffff" }}>
            <span className="text-[10px]" style={{ color: "#f87171" }}>Delete this entry?</span>
            <button onClick={handleDelete} disabled={deleting} className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: "#dc2626", color: "#111111" }}>
              {deleting ? "..." : "Yes"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#111111", color: "#111111" }}>No</button>
          </div>
        )}
        {contact.outcome && <div className="text-[11px] mb-1" style={{ color: "#111111" }}>{contact.outcome}</div>}
        {contact.notes && <div className="text-xs" style={{ color: "#111111" }}>{contact.notes}</div>}
        {waitingOn && (
          <div className="text-[10px] mt-1.5 px-2 py-1 rounded inline-block" style={{ background: "#eff6ff", color: "#60a5fa" }}>
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
      <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#111111", letterSpacing: "0.12em" }}>{label}</div>
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
      style={{ background: "#f9f9f9", color: value ? "#fff" : "#111111", minWidth: 90 }}
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ============== Pipeline Kanban Board ==============
// Reorder so "Contacted — Not Interested" sits at the end near "Lost"
const PIPELINE_BOARD_STAGES = (() => {
  const base = PIPELINE_STAGES.filter((s) => s !== "TEST" && s !== "Not Applicable" && s !== "Contacted — Not Interested");
  const notStartedIdx = base.indexOf("Not Started");
  if (notStartedIdx === -1) return ["Contacted — Not Interested", ...base];
  return [...base.slice(0, notStartedIdx + 1), "Contacted — Not Interested", ...base.slice(notStartedIdx + 1)];
})();

function PipelineCardContent({ c, overlay = false }: { c: Clinic; overlay?: boolean }) {
  const doctor = (c as Clinic & { doctor_name?: string | null }).doctor_name || c.owner_name;
  const cityLine = [c.city, c.state ? (STATES_ABBR[c.state] || c.state) : null].filter(Boolean).join(", ");
  const branches = (c as Clinic & { _branches?: Clinic[] })._branches || [];
  return (
    <>
      <div className="text-xs font-bold mb-1 truncate flex items-center gap-1.5" style={{ color: "#111111" }}>
        <span className="truncate">{c.clinic_name}</span>
        {branches.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background: "#eef2ff", color: "#4338ca" }}>
            +{branches.length} {branches.length === 1 ? "branch" : "branches"}
          </span>
        )}
      </div>
      {cityLine && (<div className="text-[10px] mb-0.5 truncate" style={{ color: "#666" }}>{cityLine}</div>)}
      {doctor && (<div className="text-[10px] mb-0.5 truncate" style={{ color: "#666" }}>{doctor}</div>)}
      {c.next_follow_up && (
        <div className="text-[10px] mb-1 flex items-center gap-1" style={{ color: "#666" }}>
          <Calendar className="w-2.5 h-2.5" /> {c.next_follow_up}
        </div>
      )}
      {!overlay && (
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="mt-2">
          {/* dropdown injected by parent */}
        </div>
      )}
    </>
  );
}

function DraggableClinicCard({
  c,
  onOpenDetail,
  onMoveStage,
  onCall,
  callingId,
}: {
  c: Clinic;
  onOpenDetail: (c: Clinic) => void;
  onMoveStage: (c: Clinic, newStage: string) => void;
  onCall: (c: Clinic) => void | Promise<void>;
  callingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: c.id,
    data: { clinic: c, status: c.status },
  });
  const doctor = (c as Clinic & { doctor_name?: string | null }).doctor_name || c.owner_name;
  const cityLine = [c.city, c.state ? (STATES_ABBR[c.state] || c.state) : null].filter(Boolean).join(", ");
  const branches = (c as Clinic & { _branches?: Clinic[] })._branches || [];
  const flagshipPhoneOk = !!c.phone && isValidAUPhone(c.phone);
  const [branchesOpen, setBranchesOpen] = useState(false);


  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="rounded-md p-2.5 cursor-pointer hover:shadow-sm transition-shadow"
      style={{ background: "#ffffff", border: "1px solid #ebebeb", opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
      onClick={() => onOpenDetail(c)}
    >
      <div className="text-xs font-bold mb-1 truncate flex items-center gap-1.5" style={{ color: "#111111" }}>
        <span className="truncate">{c.clinic_name}</span>
        {branches.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background: "#eef2ff", color: "#4338ca" }}>
            +{branches.length} {branches.length === 1 ? "branch" : "branches"}
          </span>
        )}
      </div>
      {cityLine && (<div className="text-[10px] mb-0.5 truncate" style={{ color: "#666" }}>{cityLine}</div>)}
      {doctor && (<div className="text-[10px] mb-1 truncate" style={{ color: "#666" }}>{doctor}</div>)}

      {/* Phone — quiet metadata line */}
      {flagshipPhoneOk && (
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="mb-1">
          <button
            type="button"
            onClick={() => onCall(c)}
            disabled={!!callingId && callingId !== c.id}
            className="inline-flex items-center gap-1 text-[10px] disabled:opacity-50 hover:underline"
            style={{ color: "#888" }}
            title={`Call ${c.phone}`}
          >
            {callingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" style={{ color: "#bbb" }} />}
            <span className="truncate">{c.phone}</span>
          </button>
        </div>
      )}

      {/* BRANCHES — collapsible list. Each branch has its own Call button. */}
      {branches.length > 0 && (
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="mb-1">
          <button
            type="button"
            onClick={() => setBranchesOpen((v) => !v)}
            className="w-full flex items-center justify-between text-[10px] font-semibold px-1.5 py-1 rounded"
            style={{ background: "#eef2ff", color: "#4338ca" }}
          >
            <span>{branchesOpen ? "Hide" : "Show"} {branches.length} other {branches.length === 1 ? "branch" : "branches"}</span>
            {branchesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {branchesOpen && (
            <div className="mt-1 space-y-1">
              {branches.map((b) => {
                const bCity = [b.city, b.state ? (STATES_ABBR[b.state] || b.state) : null].filter(Boolean).join(", ");
                const bPhoneOk = !!b.phone && isValidAUPhone(b.phone);
                return (
                  <div
                    key={b.id}
                    className="rounded px-1.5 py-1"
                    style={{ background: "#f9f9f7", border: "1px solid #ebebeb" }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDetail(b)}
                      className="w-full text-left hover:underline"
                      title={`Open ${b.clinic_name}`}
                    >
                      <div className="text-[10px] font-semibold truncate" style={{ color: "#111111" }}>{b.clinic_name}</div>
                      {bCity && <div className="text-[9px] truncate" style={{ color: "#666" }}>{bCity}</div>}
                    </button>
                    {bPhoneOk ? (
                      <button
                        type="button"
                        onClick={() => onCall(b)}
                        disabled={!!callingId && callingId !== b.id}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] disabled:opacity-50 hover:underline"
                        style={{ color: "#888" }}
                        title={`Call ${b.phone}`}
                      >
                        {callingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" style={{ color: "#bbb" }} />}
                        <span className="truncate">{b.phone}</span>
                      </button>
                    ) : (
                      <div className="mt-1 text-[10px] truncate" style={{ color: "#999" }}>
                        {b.phone || "No phone"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {c.next_follow_up && (
        <div className="text-[10px] mb-1 flex items-center gap-1" style={{ color: "#666" }}>
          <Calendar className="w-2.5 h-2.5" /> {c.next_follow_up}
        </div>
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2"
      >
        <Select
          value={c.status}
          onValueChange={(v) => { if (v !== c.status) onMoveStage(c, v); }}
        >
          <SelectTrigger className="h-7 text-[10px] px-2" aria-label="Move to stage">
            <SelectValue placeholder="Move to…" />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_BOARD_STAGES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  items,
  children,
}: {
  stage: string;
  items: Clinic[];
  children: React.ReactNode;
}) {
  const colour = STAGE_COLORS[stage] || STAGE_COLORS["Not Started"];
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      className="shrink-0 flex flex-col rounded-lg"
      style={{
        width: 240,
        background: isOver ? "#ecebe4" : "#f4f3ee",
        border: isOver ? "1px solid #111111" : "1px solid #ebebeb",
        transition: "background 120ms, border-color 120ms",
      }}
    >
      <div
        className="px-3 py-2 rounded-t-lg flex items-center justify-between"
        style={{ background: colour.bg, color: colour.text, borderBottom: "1px solid #ebebeb" }}
      >
        <span className="text-[11px] font-bold uppercase truncate" style={{ letterSpacing: "0.05em" }}>{stage}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.08)", color: colour.text }}>{items.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {children}
        {items.length === 0 && (
          <div className="text-[10px] text-center py-3" style={{ color: "#999" }}>No clinics</div>
        )}
      </div>
    </div>
  );
}

function PipelineBoard({
  clinics,
  onOpenDetail,
  onMoveStage,
  onCall,
  callingId,
}: {
  clinics: Clinic[];
  onOpenDetail: (c: Clinic) => void;
  onMoveStage: (c: Clinic, newStage: string) => void;
  onCall: (c: Clinic) => void | Promise<void>;
  callingId: string | null;
}) {
  const byStage: Record<string, Clinic[]> = {};
  for (const s of PIPELINE_BOARD_STAGES) byStage[s] = [];
  for (const c of clinics) {
    if (byStage[c.status]) byStage[c.status].push(c);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        const c = (e.active.data.current as { clinic?: Clinic } | undefined)?.clinic;
        if (c) setActiveClinic(c);
      }}
      onDragCancel={() => setActiveClinic(null)}
      onDragEnd={(e) => {
        setActiveClinic(null);
        const overId = e.over?.id;
        if (!overId) return;
        const data = e.active.data.current as { clinic?: Clinic } | undefined;
        const clinic = data?.clinic;
        if (!clinic) return;
        const newStage = String(overId);
        if (newStage === clinic.status) return;
        if (!PIPELINE_BOARD_STAGES.includes(newStage)) return;
        onMoveStage(clinic, newStage);
      }}
    >
      <div className="h-full overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full">
          {PIPELINE_BOARD_STAGES.map((stage) => {
            const items = byStage[stage] || [];
            return (
              <StageColumn key={stage} stage={stage} items={items}>
                {items.map((c) => (
                  <DraggableClinicCard key={c.id} c={c} onOpenDetail={onOpenDetail} onMoveStage={onMoveStage} onCall={onCall} callingId={callingId} />
                ))}
              </StageColumn>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeClinic ? (
          <div
            className="rounded-md p-2.5 shadow-lg"
            style={{ background: "#ffffff", border: "1px solid #111111", width: 204 }}
          >
            <PipelineCardContent c={activeClinic} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}


declare module "react" {}



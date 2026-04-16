import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Pause,
  Download,
  Loader2,
  Trash2,
  UserPlus,
  Delete,
  Clock,
  Users,
  Plus,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/_dashboard/clients")({
  component: ClientsPage,
});

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
};

type CallRecord = {
  id: string;
  client_id: string | null;
  twilio_call_sid: string | null;
  status: string | null;
  duration: number | null;
  recording_url: string | null;
  recording_sid: string | null;
  called_at: string;
};

type SavedPhone = {
  name: string;
  phone: string;
};

const DIAL_PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const DEFAULT_PHONES: SavedPhone[] = [
  { name: "Peter Semrany", phone: "0418214953" },
];

function getStoredPhones(): SavedPhone[] {
  try {
    const stored = localStorage.getItem("saved_caller_phones");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_PHONES;
}

function storePhones(phones: SavedPhone[]) {
  localStorage.setItem("saved_caller_phones", JSON.stringify(phones));
}

function ClientsPage() {
  const [activeTab, setActiveTab] = useState<"dialer" | "contacts" | "history">("dialer");
  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [lastCallSid, setLastCallSid] = useState<string | null>(null);
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [saveContactName, setSaveContactName] = useState("");
  const [saveContactEmail, setSaveContactEmail] = useState("");

  // Caller phone dropdown
  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>(getStoredPhones);
  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newPhoneName, setNewPhoneName] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [allRecords, setAllRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const selectedPhone = savedPhones[selectedPhoneIdx] || savedPhones[0];

  const loadClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  }, []);

  const loadAllRecords = useCallback(async () => {
    const { data } = await supabase
      .from("call_records")
      .select("*")
      .order("called_at", { ascending: false })
      .limit(50);
    if (data) setAllRecords(data as CallRecord[]);
  }, []);

  useEffect(() => {
    loadClients();
    loadAllRecords();
  }, [loadClients, loadAllRecords]);

  // Keyboard support for dialer
  useEffect(() => {
    if (activeTab !== "dialer") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ("0123456789*#".includes(e.key)) {
        setDialNumber((prev) => prev + e.key);
      } else if (e.key === "Backspace") {
        setDialNumber((prev) => prev.slice(0, -1));
      } else if (e.key === "+" && dialNumber === "") {
        setDialNumber("+");
      } else if (e.key === "Enter" && dialNumber && selectedPhone && !calling) {
        e.preventDefault();
        handleInitiateCall();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, dialNumber, selectedPhone, calling]);

  const handleDialPress = (digit: string) => {
    setDialNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const handleAddPhone = () => {
    if (!newPhoneName || !newPhoneNumber) return;
    const updated = [...savedPhones, { name: newPhoneName, phone: newPhoneNumber }];
    setSavedPhones(updated);
    storePhones(updated);
    setSelectedPhoneIdx(updated.length - 1);
    setNewPhoneName("");
    setNewPhoneNumber("");
    setShowAddPhone(false);
    setShowPhoneDropdown(false);
  };

  const handleInitiateCall = async () => {
    if (!dialNumber || !selectedPhone) return;
    setCalling(true);
    setCallMessage(null);

    try {
      const { data: result, error } = await supabase.functions.invoke("twilio-voice", {
        body: { clientPhone: dialNumber, userPhone: selectedPhone.phone },
      });

      if (error) throw error;

      if (result?.success && result?.callSid) {
        setLastCallSid(result.callSid);
        setCallMessage("Calling your phone... answer within 20 seconds.");

        const matchingClient = clients.find((c) => c.phone === dialNumber);

        await supabase.from("call_records").insert({
          client_id: matchingClient?.id || null,
          twilio_call_sid: result.callSid,
          status: "initiated",
        });

        // Poll for call status to detect timeout/no-answer
        let resolved = false;
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const { data: records } = await supabase
            .from("call_records")
            .select("status")
            .eq("twilio_call_sid", result.callSid)
            .single();

          if (records?.status === "completed") {
            resolved = true;
            setCallMessage(null);
            if (!matchingClient) setShowSaveContact(true);
            break;
          }
          if (records?.status === "no-answer" || records?.status === "busy" || records?.status === "failed" || records?.status === "canceled" || records?.status === "machine_detected") {
            resolved = true;
            const msg = records?.status === "machine_detected"
              ? "Call cancelled — went to voicemail."
              : "Call cancelled — you didn't answer in time.";
            setCallMessage(msg);
            setTimeout(() => setCallMessage(null), 5000);
            break;
          }
        }

        if (!resolved) {
          setCallMessage("Call cancelled — you didn't answer in time.");
          setTimeout(() => setCallMessage(null), 5000);
        }

        loadAllRecords();
      }
    } catch (err) {
      console.error("Call failed:", err);
      setCallMessage("Call failed. Please try again.");
      setTimeout(() => setCallMessage(null), 5000);
    } finally {
      setCalling(false);
    }
  };

  const handleSaveContact = async () => {
    if (!saveContactName || !dialNumber) return;

    const { data } = await supabase
      .from("clients")
      .insert({
        name: saveContactName,
        phone: dialNumber,
        email: saveContactEmail || null,
      })
      .select()
      .single();

    if (data && lastCallSid) {
      // Link the call record to the new client
      await supabase
        .from("call_records")
        .update({ client_id: data.id })
        .eq("twilio_call_sid", lastCallSid);
    }

    setSaveContactName("");
    setSaveContactEmail("");
    setShowSaveContact(false);
    setLastCallSid(null);
    loadClients();
    loadAllRecords();
  };

  const handleCallContact = (client: Client) => {
    setDialNumber(client.phone);
    setActiveTab("dialer");
  };

  const handleDeleteClient = async (id: string) => {
    await supabase.from("clients").delete().eq("id", id);
    loadClients();
    loadAllRecords();
  };

  const handleCheckRecording = async (record: CallRecord) => {
    if (!record.twilio_call_sid || record.recording_url) return;
    loadAllRecords();
  };

  const getProxyUrl = (recordingUrl: string, download = false) => {
    const base = import.meta.env.VITE_SUPABASE_URL;
    return `${base}/functions/v1/twilio-recording?url=${encodeURIComponent(recordingUrl)}${download ? "&download=1" : ""}`;
  };

  const togglePlayback = (url: string) => {
    if (playingUrl === url) {
      audioRef?.pause();
      setPlayingUrl(null);
    } else {
      setPlayingUrl(url);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Unknown";
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "Unknown";
  };

  const getClientPhone = (clientId: string | null) => {
    if (!clientId) return "";
    const client = clients.find((c) => c.id === clientId);
    return client?.phone || "";
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
        PHONE
      </h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1">
        {[
          { id: "dialer" as const, label: "Dialer", icon: Phone },
          { id: "contacts" as const, label: "Contacts", icon: Users },
          { id: "history" as const, label: "History", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* DIALER TAB */}
      {activeTab === "dialer" && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-xs">
            {/* Number Display */}
            <div className="bg-card border border-border rounded-xl p-6 mb-4 text-center">
              <p className="text-3xl font-mono font-bold text-foreground tracking-wider min-h-[2.5rem]">
                {dialNumber || (
                  <span className="text-muted-foreground/40">Enter number</span>
                )}
              </p>
            </div>

            {/* Dial Pad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {DIAL_PAD.flat().map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDialPress(digit)}
                  className="h-16 rounded-xl bg-card border border-border text-2xl font-semibold text-foreground hover:bg-accent/20 active:scale-95 transition-all"
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Select Phone Dropdown */}
            <div className="mb-4 relative">
              <button
                onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                className="w-full flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {selectedPhone
                      ? `${selectedPhone.name} - ${selectedPhone.phone}`
                      : "Select phone"}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPhoneDropdown ? "rotate-180" : ""}`} />
              </button>

              {showPhoneDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {savedPhones.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPhoneIdx(idx);
                        setShowPhoneDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent/20 transition-colors ${
                        idx === selectedPhoneIdx ? "bg-accent/10 font-medium" : ""
                      }`}
                    >
                      {p.name} - {p.phone}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowAddPhone(true);
                      setShowPhoneDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-accent/20 transition-colors flex items-center gap-2 border-t border-border"
                  >
                    <Plus className="w-4 h-4" /> Add new number
                  </button>
                </div>
              )}

              {showAddPhone && (
                <div className="mt-2 bg-card border border-border rounded-lg p-3 space-y-2">
                  <Input
                    placeholder="Name"
                    value={newPhoneName}
                    onChange={(e) => setNewPhoneName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Phone number"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddPhone} size="sm" className="flex-1">
                      Save
                    </Button>
                    <Button onClick={() => setShowAddPhone(false)} size="sm" variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Call / Backspace Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex-1" />
              <button
                onClick={handleInitiateCall}
                disabled={!dialNumber || !selectedPhone || calling}
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                {calling ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <PhoneCall className="w-7 h-7 text-white" />
                )}
              </button>
              <div className="flex-1 flex justify-start">
                {dialNumber && (
                  <button
                    onClick={handleBackspace}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Call Status Message */}
            {callMessage && (
              <div className={`mt-4 text-center text-sm font-medium px-4 py-3 rounded-lg ${
                callMessage.includes("cancelled") || callMessage.includes("failed")
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}>
                {callMessage}
              </div>
            )}

            {/* Save Contact Prompt */}
            {showSaveContact && (
              <div className="mt-6 bg-card border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Save this number?</p>
                <p className="text-xs text-muted-foreground">{dialNumber}</p>
                <Input
                  placeholder="Contact name"
                  value={saveContactName}
                  onChange={(e) => setSaveContactName(e.target.value)}
                />
                <Input
                  placeholder="Email (optional)"
                  value={saveContactEmail}
                  onChange={(e) => setSaveContactEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveContact} size="sm" className="flex-1">
                    <UserPlus className="w-4 h-4 mr-1" /> Save Contact
                  </Button>
                  <Button
                    onClick={() => setShowSaveContact(false)}
                    size="sm"
                    variant="ghost"
                  >
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === "contacts" && (
        <div className="space-y-2">
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              No saved contacts yet. Make a call and save the contact after.
            </p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-green-500 hover:text-green-400"
                    onClick={() => handleCallContact(client)}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {allRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No call history yet.</p>
          ) : (
            allRecords.map((record) => (
              <div
                key={record.id}
                className="bg-card border border-border rounded-lg px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.status === "completed"
                          ? "bg-green-500/20"
                          : "bg-yellow-500/20"
                      }`}
                    >
                      {record.status === "completed" ? (
                        <PhoneOff className="w-4 h-4 text-green-400" />
                      ) : (
                        <PhoneCall className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {getClientName(record.client_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getClientPhone(record.client_id)} · {formatDate(record.called_at)} ·{" "}
                        {formatDuration(record.duration)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {record.recording_url ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => togglePlayback(getProxyUrl(record.recording_url ?? ""))}
                        >
                          {playingUrl === getProxyUrl(record.recording_url ?? "") ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <a
                          href={getProxyUrl(record.recording_url ?? "", true)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </>
                    ) : record.twilio_call_sid ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => handleCheckRecording(record)}
                      >
                        Check Recording
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-500"
                      onClick={() => {
                        const phone = getClientPhone(record.client_id);
                        if (phone) {
                          setDialNumber(phone);
                          setActiveTab("dialer");
                        }
                      }}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {record.recording_url && playingUrl === getProxyUrl(record.recording_url) && (
                  <div className="mt-2">
                    <audio
                      controls
                      autoPlay
                      src={getProxyUrl(record.recording_url)}
                      ref={(el) => setAudioRef(el)}
                      onEnded={() => setPlayingUrl(null)}
                      className="w-full h-8"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

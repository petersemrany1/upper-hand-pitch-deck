import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Plus, Play, Download, Loader2, Trash2 } from "lucide-react";
import { initiateCall, fetchCallRecordings } from "@/utils/twilio-voice.functions";

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
  client_id: string;
  twilio_call_sid: string | null;
  status: string | null;
  duration: number | null;
  recording_url: string | null;
  recording_sid: string | null;
  called_at: string;
};

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [callRecords, setCallRecords] = useState<Record<string, CallRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [callingClientId, setCallingClientId] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState("");
  const [showCallPrompt, setShowCallPrompt] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  }, []);

  const loadCallRecords = useCallback(async (clientId: string) => {
    const { data } = await supabase
      .from("call_records")
      .select("*")
      .eq("client_id", clientId)
      .order("called_at", { ascending: false });
    if (data) {
      setCallRecords((prev) => ({ ...prev, [clientId]: data }));
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    clients.forEach((c) => loadCallRecords(c.id));
  }, [clients, loadCallRecords]);

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) return;
    await supabase.from("clients").insert({
      name: newClient.name,
      phone: newClient.phone,
      email: newClient.email || null,
    });
    setNewClient({ name: "", phone: "", email: "" });
    setShowAddForm(false);
    loadClients();
  };

  const handleDeleteClient = async (id: string) => {
    await supabase.from("clients").delete().eq("id", id);
    loadClients();
  };

  const handleCall = async (client: Client) => {
    if (!userPhone) return;
    setCallingClientId(client.id);
    setShowCallPrompt(null);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    try {
      const result = await initiateCall({
        data: { clientPhone: client.phone, userPhone, callbackUrl: baseUrl },
      });

      if (result.success && result.callSid) {
        await supabase.from("call_records").insert({
          client_id: client.id,
          twilio_call_sid: result.callSid,
          status: "initiated",
        });
        loadCallRecords(client.id);
      }
    } catch (err) {
      console.error("Call failed:", err);
    } finally {
      setCallingClientId(null);
    }
  };

  const handleCheckRecordings = async (record: CallRecord) => {
    if (!record.twilio_call_sid || record.recording_url) return;
    const result = await fetchCallRecordings({ data: { callSid: record.twilio_call_sid } });
    if (result.success && result.recordings.length > 0) {
      const rec = result.recordings[0];
      await supabase
        .from("call_records")
        .update({ recording_url: rec.url, recording_sid: rec.sid, duration: rec.duration })
        .eq("id", record.id);
      loadCallRecords(record.client_id);
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black" style={{ fontFamily: "var(--font-display)" }}>
          CLIENTS
        </h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Client
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-3">
          <Input
            placeholder="Client name"
            value={newClient.name}
            onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            placeholder="Phone (e.g. +61412345678)"
            value={newClient.phone}
            onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
          />
          <Input
            placeholder="Email (optional)"
            value={newClient.email}
            onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button onClick={handleAddClient} size="sm">Save</Button>
            <Button onClick={() => setShowAddForm(false)} size="sm" variant="ghost">Cancel</Button>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <p className="text-muted-foreground">No clients yet. Add your first client above.</p>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => {
            const records = callRecords[client.id] || [];
            return (
              <div key={client.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-foreground">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                    {client.email && (
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {showCallPrompt === client.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Your phone number"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          className="w-48 h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCall(client)}
                          disabled={!userPhone || callingClientId === client.id}
                        >
                          {callingClientId === client.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Connect"
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCallPrompt(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCallPrompt(client.id)}
                        disabled={callingClientId === client.id}
                      >
                        <Phone className="w-4 h-4 mr-1" /> Call
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {records.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Call History
                    </h4>
                    <div className="space-y-2">
                      {records.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between text-sm bg-background/50 rounded px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{formatDate(record.called_at)}</span>
                            <span className="text-foreground">{formatDuration(record.duration)}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                record.status === "completed"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}
                            >
                              {record.status || "initiated"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {record.recording_url ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() =>
                                    setPlayingUrl(
                                      playingUrl === record.recording_url ? null : record.recording_url
                                    )
                                  }
                                >
                                  <Play className="w-3 h-3" />
                                </Button>
                                <a
                                  href={record.recording_url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </a>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => handleCheckRecordings(record)}
                              >
                                Check Recording
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {playingUrl && (
                      <div className="mt-2">
                        <audio controls autoPlay src={playingUrl} className="w-full h-8" />
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
}

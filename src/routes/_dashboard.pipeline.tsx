import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users, Clock, CheckCircle2, PhoneOff, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_dashboard/pipeline")({
  component: PipelinePage,
});

const FIRST_NAMES = [
  "James","Jack","Liam","Noah","Oliver","William","Thomas","Lucas","Henry","Ethan",
  "Alexander","Daniel","Matthew","Samuel","Benjamin","Harrison","Ryan","Jake","Cooper","Max",
  "Leo","Oscar","Charlie","Archie","George","Hugo","Felix","Sebastian","Lachlan","Riley",
  "Angus","Patrick","Finn","Marcus","Nathan","Mitchell","Adrian","Caleb","Aaron","Dylan",
  "Joshua","Cameron","Kai","Tyler","Hayden","Declan","Ryder","Jasper","Austin","Blake",
  "Darcy","Connor","Beau","Xavier","Zac","Aiden","Bailey","Dominic","Eli","Flynn",
  "Hamish","Isaac","Jett","Levi","Mason","Owen","Reid","Scott","Toby","Vincent",
  "Ashton","Brody","Callum","Drew","Edward","Fraser","Grayson","Heath","Jai","Kian",
  "Lincoln","Miles","Nate","Phoenix","Rhys","Spencer","Tate","Wade","Bodhi","Cody",
  "Dane","Ezra","Harley","Jaxon","Kobe","Logan","Marshall","Nico","Parker","Quinn",
];

const LAST_NAMES = [
  "Hartley","Russo","Webb","Mitchell","O'Brien","Sullivan","Clarke","Henderson","Murray","Campbell",
  "Thompson","Anderson","Taylor","Wilson","Brown","Walker","Harris","Robinson","Kelly","Evans",
  "Stewart","Morgan","Bennett","Cooper","Hughes","Ward","Foster","Barnes","Graham","Palmer",
  "Stone","Reid","Burns","Walsh","Byrne","Murphy","Collins","Doyle","Ryan","Lynch",
  "Gallagher","Murray","Quinn","Brady","Carroll","Duffy","Brennan","Nolan","Daly","Kavanagh",
];

const SUBURBS = [
  "Bondi","Manly","Surry Hills","Newtown","Parramatta","Chatswood","Cronulla",
  "Mosman","Randwick","Marrickville","Balmain","Drummoyne","Burwood","Strathfield",
  "Epping","Hornsby","Penrith","Liverpool","Bankstown","Canterbury","Hurstville",
  "Kogarah","Sutherland","Miranda","Caringbah","Dee Why","Brookvale","Neutral Bay",
  "Crows Nest","Lane Cove","Ryde","Gladesville","Concord","Leichhardt","Paddington",
  "Double Bay","Rose Bay","Vaucluse","Woollahra","Redfern","Waterloo","Zetland",
  "Alexandria","Mascot","Botany","Maroubra","Coogee","Bronte","Waverley","Ashfield",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type PipelineStatus = "Awaiting clinic" | "Allocated" | "Not Yet Called" | "Disqualified";

type PatientRow = {
  id: string;
  name: string;
  suburb: string;
  status: PipelineStatus;
  flash?: boolean;
  isNew?: boolean;
};

let idCounter = 0;
function generatePatient(status: PipelineStatus): PatientRow {
  return {
    id: `p-${++idCounter}`,
    name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
    suburb: pickRandom(SUBURBS),
    status,
    flash: false,
    isNew: false,
  };
}

function generateInitialData(): PatientRow[] {
  const rows: PatientRow[] = [];
  // ~67 allocated, ~183 not yet called, rest awaiting clinic ≈ 250 qualified
  for (let i = 0; i < 183; i++) rows.push(generatePatient("Not Yet Called"));
  for (let i = 0; i < 67; i++) rows.push(generatePatient(Math.random() < 0.52 ? "Allocated" : "Awaiting clinic"));
  // 1847 disqualified
  for (let i = 0; i < 1847; i++) rows.push(generatePatient("Disqualified"));
  // Shuffle qualified rows (first 250) so they're mixed
  const qualified = rows.slice(0, 250);
  for (let i = qualified.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [qualified[i], qualified[j]] = [qualified[j], qualified[i]];
  }
  return [...qualified, ...rows.slice(250)];
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document !== "undefined" ? document.visibilityState === "visible" : true);
  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  return visible;
}

function usePausableInterval(callback: () => void, getDelay: () => number, visible: boolean) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    if (!visible) return;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      callbackRef.current();
      timeout = setTimeout(tick, getDelay());
    };
    timeout = setTimeout(tick, getDelay());
    return () => clearTimeout(timeout);
  }, [visible, getDelay]);
}

const STATUS_PILL: Record<PipelineStatus, { bg: string; color: string }> = {
  "Allocated": { bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
  "Awaiting clinic": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "Not Yet Called": { bg: "rgba(161,161,170,0.15)", color: "#a1a1aa" },
  "Disqualified": { bg: "rgba(220,38,38,0.15)", color: "#f87171" },
};

function PipelinePage() {
  const [rows, setRows] = useState<PatientRow[]>(() => generateInitialData());
  const parentRef = useRef<HTMLDivElement>(null);
  const dqRef = useRef<HTMLDivElement>(null);
  const visible = usePageVisible();
  const [showDQ, setShowDQ] = useState(false);

  // Separate qualified and disqualified
  const qualifiedRows = rows.filter((r) => r.status !== "Disqualified");
  const disqualifiedRows = rows.filter((r) => r.status === "Disqualified");

  useEffect(() => {
    const timer = setTimeout(() => {
      setRows((prev) => {
        const needsClean = prev.some((r) => r.flash || r.isNew);
        if (!needsClean) return prev;
        return prev.map((r) => (r.flash || r.isNew ? { ...r, flash: false, isNew: false } : r));
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [rows]);

  // Flip a "Not Yet Called" -> "Awaiting clinic" every 30-60s
  const flipDelay = useCallback(() => rand(30000, 60000), []);
  usePausableInterval(() => {
    setRows((prev) => {
      const notCalled = prev.filter((r) => r.status === "Not Yet Called");
      if (notCalled.length === 0) return prev;
      const target = pickRandom(notCalled);
      return prev.map((r) => (r.id === target.id ? { ...r, status: "Awaiting clinic", flash: true } : r));
    });
  }, flipDelay, visible);

  // Flip an "Awaiting clinic" -> "Allocated" every 35-70s
  const allocDelay = useCallback(() => rand(35000, 70000), []);
  usePausableInterval(() => {
    setRows((prev) => {
      const awaiting = prev.filter((r) => r.status === "Awaiting clinic");
      if (awaiting.length === 0) return prev;
      const target = pickRandom(awaiting);
      return prev.map((r) => (r.id === target.id ? { ...r, status: "Allocated", flash: true } : r));
    });
  }, allocDelay, visible);

  // Add a new qualified row + 3-7 disqualified rows every 60-90s
  const newRowDelay = useCallback(() => rand(60000, 90000), []);
  usePausableInterval(() => {
    const p = generatePatient("Awaiting clinic");
    p.isNew = true;
    const dqCount = rand(3, 7);
    const newDQ: PatientRow[] = [];
    for (let i = 0; i < dqCount; i++) newDQ.push(generatePatient("Disqualified"));
    setRows((prev) => {
      // Insert qualified at top of qualified section, DQ at end
      const qual = prev.filter((r) => r.status !== "Disqualified");
      const dq = prev.filter((r) => r.status === "Disqualified");
      return [p, ...qual, ...newDQ, ...dq];
    });
  }, newRowDelay, visible);

  // Derived stats
  const disqualifiedCount = disqualifiedRows.length;
  const totalQualified = qualifiedRows.length;
  const notYetCalledCount = rows.filter((r) => r.status === "Not Yet Called").length;
  const awaitingCount = rows.filter((r) => r.status === "Awaiting clinic").length;
  const allocatedCount = rows.filter((r) => r.status === "Allocated").length;

  const qualifiedVirtualizer = useVirtualizer({
    count: qualifiedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

  const dqVirtualizer = useVirtualizer({
    count: disqualifiedRows.length,
    getScrollElement: () => dqRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

  const stats = [
    { label: "Disqualified", value: disqualifiedCount.toLocaleString(), icon: XCircle, color: "#DC2626" },
    { label: "Total Qualified", value: totalQualified.toLocaleString(), icon: Users, color: "#22C55E" },
    { label: "Not Yet Called", value: notYetCalledCount, icon: PhoneOff, color: "#71717A" },
    { label: "Awaiting Clinic", value: awaitingCount, icon: Clock, color: "#F59E0B" },
    { label: "Allocated", value: allocatedCount, icon: CheckCircle2, color: "#22C55E" },
  ];
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#09090b" }}>
      <div className="px-6 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-white mb-4">Patient Pipeline</h1>
        <div className="grid grid-cols-5 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border px-3 py-3 flex items-center gap-2.5"
              style={{ background: "#111114", borderColor: "#1f1f23" }}
            >
              <div
                className="flex items-center justify-center rounded-md shrink-0"
                style={{ width: 36, height: 36, background: `${s.color}18` }}
              >
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: "#666" }}>{s.label}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Qualified Pipeline Table */}
      <div className="flex-1 mx-6 mb-2 rounded-lg border overflow-hidden flex flex-col" style={{ borderColor: "#1f1f23", background: "#111114" }}>
        <div
          className="grid text-[11px] uppercase tracking-wider font-medium px-4 py-2.5 border-b"
          style={{
            gridTemplateColumns: "1.5fr 1fr 1fr 0.9fr 0.8fr",
            color: "#666",
            borderColor: "#1f1f23",
            background: "#0d0d10",
          }}
        >
          <div>Name</div>
          <div>Suburb</div>
          <div>Budget</div>
          <div>Deposit Paid</div>
          <div>Status</div>
        </div>

        <div ref={parentRef} className="flex-1 overflow-auto">
          <div style={{ height: `${qualifiedVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
            {qualifiedVirtualizer.getVirtualItems().map((vRow) => {
              const row = qualifiedRows[vRow.index];
              return (
                <div
                  key={row.id}
                  className="grid items-center px-4 border-b transition-colors duration-700"
                  style={{
                    gridTemplateColumns: "1.5fr 1fr 1fr 0.9fr 0.8fr",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${vRow.size}px`,
                    transform: `translateY(${vRow.start}px)`,
                    borderColor: "#1a1a1e",
                    background: row.flash
                      ? "rgba(34,197,94,0.12)"
                      : row.isNew
                        ? "rgba(245,158,11,0.08)"
                        : "transparent",
                    color: "#ccc",
                    fontSize: 13,
                  }}
                >
                  <div className="text-white font-medium truncate">{row.name}</div>
                  <div className="truncate">{row.suburb}</div>
                  <div>$15,000–$20,000</div>
                  <div className="flex items-center gap-1.5">
                    {row.status === "Awaiting clinic" || row.status === "Allocated" ? (
                      <>
                        <span className="text-green-400">$75</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      </>
                    ) : (
                      <span style={{ color: "#555" }}>—</span>
                    )}
                  </div>
                  <div>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={STATUS_PILL[row.status]}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disqualified Section — collapsible */}
      <div className="mx-6 mb-4 rounded-lg border overflow-hidden" style={{ borderColor: "#1f1f23", background: "#111114" }}>
        <button
          onClick={() => setShowDQ((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] uppercase tracking-wider font-medium"
          style={{ color: "#666", background: "#0d0d10" }}
        >
          <span>Disqualified Leads ({disqualifiedCount.toLocaleString()})</span>
          {showDQ ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showDQ && (
          <div ref={dqRef} className="overflow-auto" style={{ maxHeight: 260 }}>
            <div style={{ height: `${dqVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {dqVirtualizer.getVirtualItems().map((vRow) => {
                const row = disqualifiedRows[vRow.index];
                return (
                  <div
                    key={row.id}
                    className="grid items-center px-4 border-b"
                    style={{
                      gridTemplateColumns: "1.5fr 1fr 1fr 0.9fr 0.8fr",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                      borderColor: "#1a1a1e",
                      color: "#555",
                      fontSize: 13,
                    }}
                  >
                    <div className="font-medium truncate">{row.name}</div>
                    <div className="truncate">{row.suburb}</div>
                    <div>—</div>
                    <div>—</div>
                    <div>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={STATUS_PILL["Disqualified"]}
                      >
                        Disqualified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
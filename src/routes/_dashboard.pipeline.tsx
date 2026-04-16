import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users, Clock, CheckCircle2, DollarSign, PhoneOff, XCircle } from "lucide-react";

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

const BUDGET_RANGES = [
  { label: "$5,000–$10,000", weight: 0.2 },
  { label: "$10,000–$15,000", weight: 0.5 },
  { label: "$15,000–$20,000", weight: 0.3 },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickBudget(): string {
  const r = Math.random();
  if (r < 0.2) return BUDGET_RANGES[0].label;
  if (r < 0.7) return BUDGET_RANGES[1].label;
  return BUDGET_RANGES[2].label;
}

type PatientRow = {
  id: string;
  name: string;
  suburb: string;
  budget: string;
  status: "Awaiting clinic" | "Allocated";
  flash?: boolean;
  isNew?: boolean;
};

let idCounter = 0;
function generatePatient(status: "Awaiting clinic" | "Allocated" = "Awaiting clinic"): PatientRow {
  return {
    id: `p-${++idCounter}`,
    name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
    suburb: pickRandom(SUBURBS),
    budget: pickBudget(),
    status,
    flash: false,
    isNew: false,
  };
}

function generateInitialData(): PatientRow[] {
  const rows: PatientRow[] = [];
  for (let i = 0; i < 250; i++) {
    rows.push(generatePatient(Math.random() < 0.35 ? "Allocated" : "Awaiting clinic"));
  }
  return rows;
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

function PipelinePage() {
  const [rows, setRows] = useState<PatientRow[]>(() => generateInitialData());
  const parentRef = useRef<HTMLDivElement>(null);
  const visible = usePageVisible();

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

  // Flip awaiting -> allocated
  const flipDelay = useCallback(() => rand(30000, 60000), []);
  usePausableInterval(() => {
    setRows((prev) => {
      const awaiting = prev.filter((r) => r.status === "Awaiting clinic");
      if (awaiting.length === 0) return prev;
      const target = pickRandom(awaiting);
      return prev.map((r) => (r.id === target.id ? { ...r, status: "Allocated", flash: true } : r));
    });
  }, flipDelay, visible);

  // Add new row + increment disqualified + decrement notYetCalled
  const [disqualified, setDisqualified] = useState(1847);
  const [notYetCalled, setNotYetCalled] = useState(183);
  const newRowDelay = useCallback(() => rand(60000, 90000), []);
  usePausableInterval(() => {
    const p = generatePatient("Awaiting clinic");
    p.isNew = true;
    setRows((prev) => [p, ...prev]);
    setDisqualified((d) => d + rand(3, 7));
    setNotYetCalled((n) => Math.max(0, n - 1));
  }, newRowDelay, visible);

  // Derived stats — always consistent with table
  const totalQualified = rows.length;
  const awaitingCount = rows.filter((r) => r.status === "Awaiting clinic").length;
  const allocatedCount = rows.filter((r) => r.status === "Allocated").length;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

  const stats = [
    { label: "Total Qualified Patients", value: totalQualified.toLocaleString(), icon: Users, color: "#2D6BE4" },
    { label: "Awaiting Clinic", value: awaitingCount, icon: Clock, color: "#F59E0B" },
    { label: "Allocated", value: allocatedCount, icon: CheckCircle2, color: "#22C55E" },
    { label: "Avg Procedure Budget", value: "$14,800", icon: DollarSign, color: "#8B5CF6" },
    { label: "Not Yet Called", value: notYetCalled, icon: PhoneOff, color: "#EF4444" },
    { label: "Disqualified", value: disqualified.toLocaleString(), icon: XCircle, color: "#DC2626" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#09090b" }}>
      <div className="px-6 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-white mb-4">Patient Pipeline</h1>
        <div className="grid grid-cols-6 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border px-4 py-3 flex items-center gap-3"
              style={{ background: "#111114", borderColor: "#1f1f23" }}
            >
              <div
                className="flex items-center justify-center rounded-md"
                style={{ width: 36, height: 36, background: `${s.color}18` }}
              >
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: "#666" }}>{s.label}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 mx-6 mb-4 rounded-lg border overflow-hidden flex flex-col" style={{ borderColor: "#1f1f23", background: "#111114" }}>
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
          <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index];
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
                  <div>{row.budget}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-400">$75</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <div>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={
                        row.status === "Allocated"
                          ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                          : { background: "rgba(245,158,11,0.15)", color: "#fbbf24" }
                      }
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
    </div>
  );
}
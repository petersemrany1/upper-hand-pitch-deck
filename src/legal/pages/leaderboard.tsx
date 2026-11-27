// Ported from the Legal app (family-law-floater/src/routes/_authenticated/leaderboard.tsx). Re-run the port script to refresh.
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Trophy } from "lucide-react";

import { getLeaderboardFn, type LeaderboardRangeInput } from "@/legal/bridge/leaderboard";

// Rendered inside the Upper Hand portal when Legal is selected.
export { LeaderboardPage as LegalPage };

type Preset = Exclude<LeaderboardRangeInput, { from: string; to: string }>;
const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "lastweek", label: "Last week" },
  { key: "month", label: "This month" },
  { key: "lastmonth", label: "Last month" },
  { key: "30d", label: "Last 30 days" },
];

/** Today's date in Sydney as YYYY-MM-DD (for the date pickers' default/max). */
function sydneyToday(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const GOLD = "#f5b400";

function tone(v: number, good: number, ok: number): string {
  if (v === 0) return "text-foreground";
  if (v >= good) return "text-emerald-600";
  if (v >= ok) return "text-amber-600";
  return "text-red-600";
}

function LeaderboardPage() {
  const [preset, setPreset] = useState<Preset | "custom">("today");
  const [custom, setCustom] = useState<{ from: string; to: string }>(() => ({
    from: sydneyToday(),
    to: sydneyToday(),
  }));
  const customValid =
    preset === "custom" && Boolean(custom.from && custom.to && custom.from <= custom.to);
  const range: LeaderboardRangeInput = preset === "custom" ? custom : preset;
  const board = useQuery({
    queryKey: ["leaderboard", range],
    queryFn: () => getLeaderboardFn({ data: { range } }),
    refetchInterval: 30_000,
    enabled: preset !== "custom" || customValid,
  });
  const rows = board.data?.rows ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6" style={{ color: GOLD }} />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Leaderboard
          </h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {board.isFetching
            ? "Refreshing…"
            : board.data
              ? `Updated ${new Date(board.data.generatedAt).toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" })}`
              : ""}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {PRESETS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setPreset(r.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
              preset === r.key
                ? "border-primary bg-primary text-white"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset("custom")}
          className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
            preset === "custom"
              ? "border-primary bg-primary text-white"
              : "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Custom
        </button>
        {preset === "custom" ? (
          <div className="ml-2 flex items-center gap-2 text-xs">
            <input
              type="date"
              value={custom.from}
              max={custom.to || sydneyToday()}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-[13px]"
              aria-label="From date"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              max={sydneyToday()}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-[13px]"
              aria-label="To date"
            />
            {!customValid ? (
              <span className="text-red-600">From must be on or before To</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <Th>Rank</Th>
                <Th>Rep</Th>
                <Th info="Leads dialled in this period. Several dials to the same lead count once.">
                  Calls
                </Th>
                <Th info="Dials that didn't reach a person: no answer, busy, failed, or under 15 seconds (voicemail).">
                  Not reached
                </Th>
                <Th info="Reached, but the call lasted under 2 minutes.">Short</Th>
                <Th info="Reached and the call lasted 2 minutes or more.">Convos</Th>
                <Th info="Of everyone who picked up, the share that stayed for a real conversation (2 min+).">
                  Hold %
                </Th>
                <Th info="Bookings as a share of real conversations (Booked ÷ Convos).">Conv %</Th>
                <Th info="Appointments booked in this period (by when they were booked, not the appointment date).">
                  Booked
                </Th>
                <Th info="Deposits paid in this period.">Deposits</Th>
                <Th info="Shift time from first dial to last call, split where the gap between calls exceeds 30 minutes.">
                  Work
                </Th>
                <Th info="Average idle gap between calls during a shift. Green under 1 min, amber 1–3 min, red 3 min+.">
                  Break
                </Th>
                <Th info="Bookings × $50.">Bonus</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const avgBreak = r.breakGaps > 0 ? r.breakMinutes / r.breakGaps : 0;
                const breakTone =
                  avgBreak === 0
                    ? "text-foreground"
                    : avgBreak <= 1
                      ? "text-emerald-600"
                      : avgBreak <= 3
                        ? "text-amber-600"
                        : "text-red-600";
                // Admins also build and test the app, so their shift timing isn't real — hide it.
                const hideShift = r.role === "admin";
                return (
                  <tr
                    key={r.id}
                    className="border-t"
                    style={i === 0 ? { background: "rgba(245,180,0,0.06)" } : undefined}
                  >
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {i === 0 ? (
                          <Crown className="h-4 w-4" style={{ color: GOLD }} />
                        ) : (
                          <span className="text-muted-foreground">#{i + 1}</span>
                        )}
                        {i === 0 ? (
                          <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-foreground"
                            style={{ background: GOLD }}
                          >
                            Leader
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <span className="font-semibold">{r.name}</span>
                    </Td>
                    <Td>{r.calls}</Td>
                    <Td>{r.notReached}</Td>
                    <Td>{r.short}</Td>
                    <Td>{r.convos}</Td>
                    <Td>
                      <span className={tone(r.holdRate, 60, 40)}>{r.holdRate}%</span>
                    </Td>
                    <Td>
                      <span className={tone(r.conversion, 70, 50)}>{r.conversion}%</span>
                    </Td>
                    <Td>
                      <span className={`font-bold ${r.bookings > 0 ? "text-emerald-600" : ""}`}>
                        {r.bookings}
                      </span>
                    </Td>
                    <Td>
                      <span className={r.deposits > 0 ? "font-semibold text-emerald-600" : ""}>
                        {r.deposits}
                      </span>
                    </Td>
                    <Td>{hideShift ? "—" : `${(r.workMinutes / 60).toFixed(1)}h`}</Td>
                    <Td>
                      <span className={hideShift ? "" : breakTone}>
                        {hideShift ? "—" : avgBreak > 0 ? `${avgBreak.toFixed(1)}m` : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className={r.bonus > 0 ? "font-semibold text-emerald-600" : ""}>
                        ${r.bonus}
                      </span>
                    </Td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-xs text-muted-foreground">
                    {board.isLoading
                      ? "Loading…"
                      : board.error
                        ? (board.error as Error).message
                        : "No data for this range yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Th({ children, info }: { children: ReactNode; info?: string }) {
  const [show, setShow] = useState(false);
  return (
    <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-semibold">
      <div className="flex items-center gap-1">
        {children}
        {info ? (
          <span
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            className="relative cursor-help select-none text-[10px] text-muted-foreground/60"
          >
            ⓘ
            {show ? (
              <span className="absolute left-0 top-full z-50 mt-1 w-60 whitespace-normal rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-background shadow-lg">
                {info}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-3 tabular-nums">{children}</td>;
}

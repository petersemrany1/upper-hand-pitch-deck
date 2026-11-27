// Ported from the Legal app (family-law-floater/src/components/sales-call/linking-education.tsx). Re-run the port script to refresh.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { fetchActiveLinkingPlays, rankPlays, type LinkingPlay } from "@/legal/lib/linking-education";
import { SayThis } from "./call-ui";

const MAX_EXPANDED = 2;

const GROUP_ORDER = ["Where they're at", "The money", "The assets", "The fears"];

function PlayCard({ play }: { play: LinkingPlay }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left">
      <span
        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
        style={{ background: "var(--coral)" }}
      >
        {play.chip_label}
      </span>
      <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide">{play.prompt_title}</h3>
      <div className="mt-3 space-y-2">
        <SayThis label="Open with">
          <p className="italic">“{play.callback_opener}”</p>
        </SayThis>
        <SayThis>
          <p>{play.say_this}</p>
        </SayThis>
        {play.never_say ? (
          <p className="text-[12px] leading-snug text-destructive">
            <span className="font-semibold uppercase tracking-[0.12em]">Never say:</span>{" "}
            {play.never_say}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Rep teleprompter: tap what the client said, get the right correction. */
export function LinkingEducation() {
  const plays = useQuery({ queryKey: ["linking-education-plays"], queryFn: fetchActiveLinkingPlays });
  const [selected, setSelected] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const ranked = useMemo(() => {
    const list = (plays.data ?? []).filter((p) => p.id === selected);
    return rankPlays(list);
  }, [plays.data, selected]);

  const groups = useMemo(() => {
    const all = plays.data ?? [];
    const labels = Array.from(
      new Set(all.map((p) => p.group_label).filter((l): l is string => !!l)),
    ).sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a);
      const ib = GROUP_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
    const sortIn = (list: LinkingPlay[]) => [...list].sort((a, b) => a.sort_order - b.sort_order);
    const grouped = labels.map((label) => ({
      label,
      items: sortIn(all.filter((p) => p.group_label === label)),
    }));
    const ungrouped = sortIn(all.filter((p) => !p.group_label));
    if (ungrouped.length) grouped.push({ label: null as unknown as string, items: ungrouped });
    return grouped;
  }, [plays.data]);

  const toggle = (id: string) => setSelected((prev) => (prev === id ? null : id));

  const top = ranked.slice(0, MAX_EXPANDED);
  const rest = ranked.slice(MAX_EXPANDED);

  return (
    <div className="rounded-xl border bg-muted/20 p-4 text-left">
      <h3
        className="text-[15px] font-semibold"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Linking Education
      </h3>
      <p className="text-[12px] text-muted-foreground">Tap what they’ve told you</p>

      {plays.isLoading ? (
        <p className="mt-3 text-[13px] text-muted-foreground">Loading plays…</p>
      ) : plays.isError ? (
        <p className="mt-3 text-[13px] text-destructive">Couldn’t load the plays.</p>
      ) : (
        <>
          <div className="mt-3 space-y-3">
            {groups.map((group, gi) => (
              <div key={group.label ?? `ungrouped-${gi}`}>
                {group.label ? (
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((play) => {
                    const on = selected === play.id;
                    return (
                      <button
                        key={play.id}
                        type="button"
                        onClick={() => toggle(play.id)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {play.chip_label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {ranked.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Select what the client has mentioned and the right talking points appear here.
              </p>
            ) : (
              <>
                {top.map((play) => (
                  <PlayCard key={play.id} play={play} />
                ))}
                {rest.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMore((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`}
                      />
                      {showMore ? "Hide extras" : `+${rest.length} more`}
                    </button>
                    {showMore ? (
                      <div className="mt-2 space-y-2">
                        {rest.map((play) => (
                          <PlayCard key={play.id} play={play} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

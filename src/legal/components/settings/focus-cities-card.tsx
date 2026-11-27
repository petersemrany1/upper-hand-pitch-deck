// Ported from the Legal app (family-law-floater/src/components/settings/focus-cities-card.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { supabase } from "@/legal/integrations/supabase/client";
import { fetchFocusCities, saveFocusCities } from "@/legal/lib/call-queue";

async function fetchLeadCities(): Promise<string[]> {
  const { data, error } = await supabase.from("client_leads").select("city").not("city", "is", null);
  if (error) return [];
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row.city ?? "").trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** When cities are chosen here, the call queue serves ONLY those cities. */
export function FocusCitiesCard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["focus-cities"], queryFn: fetchFocusCities });
  const known = useQuery({ queryKey: ["lead-cities"], queryFn: fetchLeadCities });
  const [cities, setCities] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (query.data) setCities(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: (next: string[]) => saveFocusCities(next),
    onSuccess: (_data, next) => {
      setCities(next);
      void queryClient.invalidateQueries({ queryKey: ["focus-cities"] });
      toast.success(next.length ? "Calling only your chosen cities" : "Calling all cities again");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (cities.some((c) => c.toLowerCase() === value.toLowerCase())) return;
    save.mutate([...cities, value]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Only call these cities</CardTitle>
        <CardDescription>
          Choose one or more cities and the call queue will serve leads from those cities only. Leave
          it empty to call every city.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="e.g. Townsville"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
                setDraft("");
              }
            }}
          />
          <Button
            onClick={() => {
              add(draft);
              setDraft("");
            }}
            disabled={save.isPending || !draft.trim()}
          >
            Add city
          </Button>
        </div>

        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : cities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No city chosen — reps are calling leads from everywhere.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <li
                key={city}
                className="flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pr-1 pl-3 text-sm"
              >
                {city}
                <button
                  type="button"
                  aria-label={`Stop focusing on ${city}`}
                  disabled={save.isPending}
                  onClick={() => save.mutate(cities.filter((c) => c !== city))}
                  className="rounded-full p-1 hover:bg-background"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {(known.data ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Cities we have leads in</p>
            <div className="flex flex-wrap gap-2">
              {(known.data ?? [])
                .filter((c) => !cities.some((x) => x.toLowerCase() === c.toLowerCase()))
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={save.isPending}
                    onClick={() => add(c)}
                    className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
                  >
                    + {c}
                  </button>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Ported from the Legal app (family-law-floater/src/components/settings/paused-cities-card.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { fetchPausedCities, savePausedCities } from "@/legal/lib/call-queue";

/** Leads in a paused city are held out of the calling queue entirely. */
export function PausedCitiesCard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["paused-cities"], queryFn: fetchPausedCities });
  const [cities, setCities] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (query.data) setCities(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: (next: string[]) => savePausedCities(next),
    onSuccess: (_data, next) => {
      setCities(next);
      void queryClient.invalidateQueries({ queryKey: ["paused-cities"] });
      toast.success("Paused cities updated");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (cities.some((c) => c.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    save.mutate([...cities, value]);
    setDraft("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paused cities</CardTitle>
        <CardDescription>
          Leads from these cities are excluded from the sales call queue until you un-pause them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="e.g. Perth"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button onClick={add} disabled={save.isPending || !draft.trim()}>
            Pause city
          </Button>
        </div>

        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : cities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cities are paused.</p>
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
                  aria-label={`Un-pause ${city}`}
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
      </CardContent>
    </Card>
  );
}

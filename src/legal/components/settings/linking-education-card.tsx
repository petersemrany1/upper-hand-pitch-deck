// Ported from the Legal app (family-law-floater/src/components/settings/linking-education-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import {
  createLinkingPlay,
  deleteLinkingPlay,
  fetchAllLinkingPlays,
  updateLinkingPlay,
  type LinkingPlay,
  type LinkingPlayInput,
} from "@/legal/lib/linking-education";

const EMPTY: LinkingPlayInput = {
  chip_label: "",
  group_label: "",
  sort_order: 0,
  priority: 1,
  callback_opener: "",
  prompt_title: "",
  say_this: "",
  never_say: "",
  active: true,
};


/** Admin-only editor for the Linking Education plays used on the sales call screen. */
export function LinkingEducationCard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["linking-education-all"], queryFn: fetchAllLinkingPlays });
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LinkingPlayInput | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["linking-education-all"] });
    void queryClient.invalidateQueries({ queryKey: ["linking-education-plays"] });
  };

  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LinkingPlayInput> }) =>
      updateLinkingPlay(id, patch),
    onSuccess: () => {
      refresh();
      toast.success("Play updated");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const create = useMutation({
    mutationFn: (input: LinkingPlayInput) => createLinkingPlay(input),
    onSuccess: () => {
      refresh();
      setDraft(null);
      toast.success("Play added");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLinkingPlay(id),
    onSuccess: () => {
      refresh();
      toast.success("Play deleted");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const plays = query.data ?? [];

  const swap = (index: number, dir: -1 | 1) => {
    const a = plays[index];
    const b = plays[index + dir];
    if (!a || !b) return;
    save.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    save.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  };

  const fields = (
    value: LinkingPlayInput,
    onChange: (patch: Partial<LinkingPlayInput>) => void,
  ) => (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          Chip label
          <Input
            value={value.chip_label}
            onChange={(e) => onChange({ chip_label: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Sort order
          <Input
            type="number"
            value={value.sort_order}
            onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Priority
          <Input
            type="number"
            value={value.priority}
            onChange={(e) => onChange({ priority: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        Group label
        <Input
          value={value.group_label ?? ""}
          placeholder="Where they're at / The money / The assets / The fears"
          onChange={(e) => onChange({ group_label: e.target.value })}
        />
      </label>
      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        Prompt title
        <Input
          value={value.prompt_title}
          onChange={(e) => onChange({ prompt_title: e.target.value })}
        />
      </label>

      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        Callback opener
        <Textarea
          rows={2}
          value={value.callback_opener}
          onChange={(e) => onChange({ callback_opener: e.target.value })}
        />
      </label>
      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        Say this
        <Textarea rows={4} value={value.say_this} onChange={(e) => onChange({ say_this: e.target.value })} />
      </label>
      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        Never say
        <Textarea
          rows={2}
          value={value.never_say ?? ""}
          onChange={(e) => onChange({ never_say: e.target.value })}
        />
      </label>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linking Education plays</CardTitle>
        <CardDescription>
          The chips and talking points reps see at the bottom of the Education step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          plays.map((play: LinkingPlay, i: number) => {
            const open = openId === play.id;
            return (
              <div key={play.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-8 text-xs text-muted-foreground">#{play.sort_order}</span>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : play.id)}
                    className="flex-1 text-left text-sm font-semibold"
                  >
                    {play.chip_label}
                  </button>
                  <span className="text-xs text-muted-foreground">P{play.priority}</span>
                  <Button size="icon" variant="ghost" onClick={() => swap(i, -1)} disabled={i === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => swap(i, 1)}
                    disabled={i === plays.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={play.active ? "secondary" : "outline"}
                    onClick={() => save.mutate({ id: play.id, patch: { active: !play.active } })}
                  >
                    {play.active ? "Active" : "Inactive"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(play.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {open ? (
                  <div className="mt-3 space-y-3">
                    {fields(play, (patch) => save.mutate({ id: play.id, patch }))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {draft ? (
          <div className="rounded-lg border p-3">
            {fields(draft, (patch) => setDraft({ ...draft, ...patch }))}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => create.mutate(draft)} disabled={create.isPending}>
                Save play
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft({ ...EMPTY, sort_order: (plays.at(-1)?.sort_order ?? 0) + 1 })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add play
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

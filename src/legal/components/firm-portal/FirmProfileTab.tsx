// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmProfileTab.tsx). Re-run the port script to refresh.
import { useCallback, useEffect, useState } from "react";
import { HandoverRecipients } from "./HandoverRecipients";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  getFirmProfileFn,
  createProfileSectionFn,
  createProfileItemFn,
  updateProfileItemFn,
} from "@/legal/lib/firm-portal.functions";
import { Button } from "@/legal/components/ui/button";
import { Textarea } from "@/legal/components/ui/textarea";

const SECTION_TITLE = "Firm profile";

function errText(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

function stripMarker(line: string) {
  return line
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/^\s*[-•*]\s*/, "")
    .trim();
}

/** Splits "You get his personal mobile. Not a switchboard..." into lead + rest. */
function splitLead(text: string): { lead: string; rest: string } {
  const m = /^(.{3,120}?[.!?:])(\s+)(.*)$/s.exec(text);
  if (!m) return { lead: text, rest: "" };
  return { lead: m[1] ?? text, rest: m[3] ?? "" };
}

export function FirmProfileTab({ firmId }: { firmId: string }) {
  const load = useServerFn(getFirmProfileFn);
  const addSection = useServerFn(createProfileSectionFn);
  const addItem = useServerFn(createProfileItemFn);
  const editItem = useServerFn(updateProfileItemFn);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [itemId, setItemId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const sections = await load({ data: { firmId } });
      const section =
        sections.find((s) => s.title === SECTION_TITLE) ?? sections[0] ?? null;
      setSectionId(section?.id ?? null);
      const first = section?.items?.[0] ?? null;
      setItemId(first?.id ?? null);
      setText(section ? section.items.map((i) => i.body).join("\n") : "");
    } catch (e) {
      toast.error(errText(e, "Could not load the firm profile"));
    } finally {
      setLoading(false);
    }
  }, [firmId, load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    const body = text.trim();
    if (!body) {
      toast.error("Paste some text first");
      return;
    }
    setSaving(true);
    try {
      let section = sectionId;
      if (!section) {
        const created = await addSection({ data: { firmId, title: SECTION_TITLE } });
        section = created.id;
        setSectionId(created.id);
      }
      if (itemId) {
        await editItem({ data: { itemId, body } });
      } else {
        const created = await addItem({ data: { sectionId: section, body } });
        setItemId(created.id);
      }
      toast.success("Firm profile saved");
    } catch (e) {
      toast.error(errText(e, "Could not save the firm profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const lines = text.split("\n").map(stripMarker).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <HandoverRecipients key={firmId} firmId={firmId} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Firm profile</h3>
          <p className="text-xs text-muted-foreground">
            Admin only. One line becomes one numbered point.
          </p>
        </div>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste the firm profile here, one line per point…"
        className="min-h-[200px] w-full resize-y text-[13px] leading-6"
      />

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your points will appear here as you type.
          </p>
        ) : (
          <ol className="space-y-3">
            {lines.map((line, i) => {
              const { lead, rest } = splitLead(line);
              return (
                <li key={i} className="flex gap-3 text-[15px] leading-7">
                  <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">{lead}</strong>
                    {rest ? <span className="text-foreground/90"> {rest}</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

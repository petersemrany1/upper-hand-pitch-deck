// Ported from the Legal app (family-law-floater/src/components/numbers/Ideation.tsx). Re-run the port script to refresh.
import { Copy, CheckCircle2, ArrowRight, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import type { HookListItem } from "@/legal/lib/call-hooks";
import { CallInsights } from "./CallInsights";

export type CreativeDraft = {
  hook: string;
  meat: string;
  cta: string;
  sourceCallId: string | null;
  concern: string;
};
export function Ideation({
  draft,
  onChange,
  pendingHook,
  onAcceptHook,
  onDismissHook,
  onUseHook,
  onViewBrain,
  storageStatus,
}: {
  draft: CreativeDraft;
  onChange: (draft: CreativeDraft) => void;
  pendingHook: HookListItem | null;
  onAcceptHook: () => void;
  onDismissHook: () => void;
  onUseHook: (item: HookListItem) => void;
  onViewBrain: () => void;
  storageStatus: "saved" | "unavailable" | "loading";
}) {
  const complete = Boolean(draft.hook.trim() && draft.meat.trim() && draft.cta.trim());
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `HOOK\n${draft.hook.trim()}\n\nMEAT\n${draft.meat.trim()}\n\nCTA\n${draft.cta.trim()}`,
      );
      toast.success("Three-part script copied");
    } catch {
      toast.error("Couldn’t copy. You can select the text in each section.");
    }
  }
  return (
    <div className="numbers-ideation">
      <section className="ideation-composer" aria-label="Three-part ad draft">
        <header>
          <div>
            <span className="ideation-eyebrow">
              <Lightbulb size={15} /> Your next ad
            </span>
            <h2>One idea. Three parts.</h2>
            <p>Start with a hook below, or write your own.</p>
          </div>
          <span className="ideation-save-state" role="status">
            {storageStatus === "saved"
              ? "Saved in this browser"
              : storageStatus === "loading"
                ? "Loading your draft…"
                : "Draft stays open in this session"}
          </span>
        </header>
        {pendingHook && (
          <div className="ideation-replace" role="alert">
            <div>
              <strong>Use this opening instead?</strong>
              <p>{pendingHook.hook}</p>
              <small>Your middle and CTA stay as written.</small>
            </div>
            <button className="numbers-button primary" onClick={onAcceptHook}>
              Replace hook
            </button>
            <button className="numbers-button" onClick={onDismissHook}>
              Keep current hook
            </button>
          </div>
        )}
        {draft.concern && (
          <div className="ideation-source">
            <CheckCircle2 size={17} />
            <p>
              <strong>Inspired by a real client concern</strong>
              <span>{draft.concern}</span>
            </p>
          </div>
        )}
        <div className="ideation-script">
          {(
            [
              [
                "hook",
                "01",
                "Hook",
                "Give them a reason to stop.",
                "Open with one specific tension or question.",
              ],
              [
                "meat",
                "02",
                "Meat",
                "Make the opening worth watching.",
                "Explain one useful idea. Keep it connected to the hook.",
              ],
              [
                "cta",
                "03",
                "CTA",
                "Give one clear next step.",
                "Say what to do next and what to expect.",
              ],
            ] as const
          ).map(([key, number, label, help, placeholder]) => (
            <label className={`ideation-part stage-${key}`} key={key}>
              <span className="ideation-part-title">
                <span className="video-stage-number">{number}</span>
                <strong>{label}</strong>
              </span>
              <span>{help}</span>
              <textarea
                aria-label={`${label} script`}
                value={draft[key]}
                maxLength={key === "meat" ? 4000 : 1000}
                rows={key === "meat" ? 6 : 4}
                placeholder={placeholder}
                onChange={(event) => onChange({ ...draft, [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <footer>
          <p>Draft for review. Check claims before filming.</p>
          <button
            className="numbers-button primary"
            disabled={!complete}
            onClick={() => void copy()}
          >
            <Copy size={15} /> Copy complete script
          </button>
        </footer>
      </section>
      <CallInsights mode="ideation" onUseHook={onUseHook} onViewBrain={onViewBrain} />
      <button className="ideation-brain-link" onClick={onViewBrain}>
        Explore client concerns in Brain <ArrowRight size={15} />
      </button>
    </div>
  );
}

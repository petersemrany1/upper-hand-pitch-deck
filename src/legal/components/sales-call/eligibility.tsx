// Ported from the Legal app (family-law-floater/src/components/sales-call/eligibility.tsx). Re-run the port script to refresh.
import { flushSync } from "react-dom";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClientAssets } from "@/legal/lib/client-assets-api";
import { assetMoney, calculateClientAssets } from "@/legal/lib/client-assets";
import { PRACTICE_LEAD_ID } from "@/legal/lib/training/practice";
import { ArrowRight, Check, ChevronDown, MessageSquare, Pencil, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/legal/components/ui/alert-dialog";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import "./eligibility.css";
import { saveEligibilityFn } from "@/legal/lib/eligibility.functions";
import {
  canConfirmExistingOrder,
  computeEligibility,
  EQUITY_ASSIST_NOTE,
  FUNDING_ISSUES,
  formatAud,
  hasRealEstate,
  isApplicable,
  netEquityOf,
  recordedEquity,
  needsOtherAssetCheck,
  needsSettlementUpdate,
  titlesOf,
  type EligibilityFlags,
  type EligibilityVerdict,
  type TitleOption,
} from "@/legal/lib/eligibility";
import type { CallLead } from "@/legal/lib/sales-call";
import { StepShell } from "./call-ui";

type EligibilityData = { answers?: EligibilityFlags; reason?: string | null } | null;

/**
 * Per-lead draft answers for this browser session. The panel unmounts on
 * every step change, so without this a rep who leaves Step 10 mid-checklist
 * and comes back would see whatever the lead looked like at page open. The
 * DB save remains the source of truth across reloads and devices.
 */
const drafts = new Map<string, EligibilityFlags>();

const VERDICT_STYLES: Record<EligibilityVerdict, { label: string; dot: string }> = {
  incomplete: {
    label: "Questions still to answer",
    dot: "bg-muted-foreground/40",
  },
  unconfirmed: {
    label: "Funding is unclear",
    dot: "bg-amber-500",
  },
  eligible: {
    label: "Likely fit for a JustFund assessment",
    dot: "bg-emerald-500",
  },
  equity_assist: {
    label: "A smaller loan may be possible",
    dot: "bg-amber-500",
  },
  denied: {
    label: "Funding looks unlikely",
    dot: "bg-red-500",
  },
};

const TITLE_LABELS: Record<TitleOption, string> = {
  yours: "My name",
  theirs: "My ex’s name",
  joint: "Both our names",
  trust_company: "A trust or company",
  unsure: "I’m not sure whose name is on the title",
};

const { none: _noIssue, unsure: _unknownIssue, ...ISSUE_DETAILS } = FUNDING_ISSUES;
const YES_NO_UNSURE = { yes: "Yes", no: "No", unsure: "I’m not sure" };
const DOCUMENTS = {
  transfer: "Papers to transfer a property",
  orders: "Court orders",
  agreement: "A financial agreement",
  other: "Something else",
  unsure: "I’m not sure",
};
const PROPERTY_STAGE = {
  open: "We’re still working it out",
  agreed: "Yes, it’s been decided",
  none: "There’s nothing to split",
  unsure: "I’m not sure",
};
const AGREEMENT_STATUS = {
  payout_to_caller: "I’m due to receive a payment",
  payout_to_ex: "I’m due to pay my ex",
  non_cash_payment: "I’ll receive property or be paid in instalments",
  unpaid: "A payment to me is overdue",
  settled: "Everything has been paid or transferred",
  reopen: "I want to change how the property was split",
  agreed_unsure: "I’m not sure",
};
const PROPERTY_STATUS = {
  ...PROPERTY_STAGE,
  ...AGREEMENT_STATUS,
  awaiting_payout: "Payment recorded",
};
const HOUSE_PLANS = {
  keep: "I’ll keep it",
  sell: "We’ll sell it",
  ex_keeps: "My ex will keep it",
  transferred: "It’s already sold or signed over",
  undecided: "We haven’t decided",
  no_house: "There’s no house involved",
};
const ChoiceView = createContext<{
  showAll: boolean;
} | null>(null);

function Choice<T extends string>({
  label,
  summary,
  showOptions = false,
  value,
  options,
  onChange,
}: {
  summary?: string;
  showOptions?: boolean;
  label: string;
  value: NoInfer<T> | undefined;
  options: Partial<Record<T, string>>;
  onChange: (v: NoInfer<T>) => void;
}) {
  const name = useId();
  const view = useContext(ChoiceView);
  const moveFocus = useRef(false);
  const [editing, setEditing] = useState(false);
  const expanded = !view || view.showAll || value === undefined || editing || showOptions;
  if (!expanded && value !== undefined && options[value]) {
    return (
      <button
        type="button"
        className="funding-answer"
        aria-label={`Edit answer to ${label === "Answer" ? summary : label}: ${options[value]}`}
        onClick={() => {
          moveFocus.current = true;
          setEditing(true);
        }}
      >
        <span>{summary ?? label}</span>
        <strong>{options[value]}</strong>
        <Pencil aria-hidden="true" />
      </button>
    );
  }
  return (
    <fieldset className="funding-choice">
      <legend className={label === "Answer" ? "sr-only" : undefined}>{label}</legend>
      <div
        className={Object.keys(options).length <= 3 ? "funding-options compact" : "funding-options"}
      >
        {(Object.keys(options) as T[]).map((key) => (
          <label key={key} className="funding-option">
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              ref={(node) => {
                if (node && moveFocus.current && value === key) {
                  moveFocus.current = false;
                  node.focus({ preventScroll: true });
                }
              }}
              onChange={() => {
                setEditing(true);
                onChange(key);
              }}
            />
            <span>{options[key]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Legacy rows may carry the old three-field Q7 / single-string Q5 shapes. */
function normaliseAnswers(a: EligibilityFlags | null): EligibilityFlags {
  if (!a) return {};
  const next: EligibilityFlags = { ...a };
  const titles = titlesOf(a);
  if (titles.length > 0) next.q5_title = titles;
  else delete next.q5_title;
  const equity = recordedEquity(a);
  if (equity !== undefined) next.q7 = { net_equity: equity };
  else delete next.q7;
  return next;
}

/** Digits with thousands separators, keeping a leading minus. */
function formatDigits(raw: string): string {
  const neg = raw.startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return neg ? "-" : "";
  return `${neg ? "-" : ""}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function Money({
  label,
  value,
  onChange,
  onClear,
  allowNegative = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number) => void;
  onClear?: () => void;
  allowNegative?: boolean;
}) {
  // Unformatted: optional leading minus + digits. Commas are display-only.
  const [raw, setRaw] = useState<string>(value === undefined ? "" : String(value));
  useEffect(() => {
    setRaw((prev) => {
      const parsed = Number(prev);
      if (value === undefined) return prev === "-" && allowNegative ? prev : "";
      return Number.isFinite(parsed) && parsed === value ? prev : String(value);
    });
  }, [value, allowNegative]);

  return (
    <label className="block min-w-0 flex-1">
      <span className="funding-field-label">{label}</span>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[13px] text-muted-foreground">
          $
        </span>
        <Input
          type="text"
          inputMode={allowNegative ? "text" : "numeric"}
          className="h-10 pl-6 tabular-nums"
          value={formatDigits(raw)}
          onChange={(e) => {
            const text = e.target.value.replace(/[,\s$]/g, "");
            if (!(allowNegative ? /^-?\d*$/ : /^\d*$/).test(text)) return;
            if (text && text !== "-" && !Number.isSafeInteger(Number(text))) return;
            setRaw(text);
            if (text === "" || text === "-") {
              onClear?.();
              return;
            }
            const n = Number(text);
            if (!Number.isFinite(n)) return;
            onChange(allowNegative ? Math.round(n) : Math.max(0, Math.round(n)));
          }}
        />
      </div>
    </label>
  );
}

function Row({
  n,
  question,
  note,
  answer,
  applicable,
  open,
  onToggle,
  onNext,
  children,
}: {
  n: number;
  question: string;
  note?: string;
  answer: string | undefined;
  applicable: boolean;
  open: boolean;
  onToggle: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const bodyId = useId();
  const expanded = applicable && open;
  const detailed = n === 1 || n === 3;
  const [showAll, setShowAll] = useState(false);
  return (
    <section className="funding-row" data-open={expanded} data-skipped={!applicable}>
      <button
        type="button"
        className="funding-heading"
        id={bodyId + "-heading"}
        data-funding-question={n}
        aria-expanded={expanded}
        aria-controls={bodyId}
        disabled={!applicable}
        onClick={onToggle}
      >
        <span className="funding-number">{n}</span>
        <span className="funding-heading-main">
          <span>{question}</span>
          {!expanded && (
            <small>{applicable ? (answer ?? "To answer") : "Skip for this caller"}</small>
          )}
        </span>
        {!expanded && applicable && answer && (
          <Check className="funding-done" aria-label="Answered" />
        )}
        {applicable && <ChevronDown className="funding-chevron" aria-hidden="true" />}
      </button>
      <div
        id={bodyId}
        role="region"
        aria-labelledby={bodyId + "-heading"}
        hidden={!expanded}
        className="funding-body"
      >
        {expanded && (
          <>
            {note && <p className="funding-note">{note}</p>}
            {detailed && (
              <button
                type="button"
                className="funding-view-toggle"
                aria-pressed={showAll}
                onClick={() => {
                  setShowAll(!showAll);
                }}
              >
                {showAll ? "Show selected answers" : "Show all choices"}
              </button>
            )}
            <ChoiceView.Provider key={String(showAll)} value={detailed ? { showAll } : null}>
              {children}
            </ChoiceView.Provider>
            <button type="button" className="funding-next" onClick={onNext}>
              {n === TOTAL_QUESTIONS ? "View result" : "Next question"}{" "}
              <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

const TOTAL_QUESTIONS = 7;

export function EligibilityCheck({
  lead,
  embedded = false,
}: {
  lead: CallLead;
  embedded?: boolean;
}) {
  const [answers, setAnswers] = useState<EligibilityFlags>(() => {
    const draft = drafts.get(lead.id);
    if (draft) return draft;
    const stored = (lead.eligibility_data as EligibilityData)?.answers ?? null;
    return normaliseAnswers(stored);
  });
  const answersRef = useRef(answers);
  answersRef.current = answers;

  /** Keep the selected question in place while the rep records and reviews answers. */
  const [open, setOpen] = useState<number | null>(
    () => computeEligibility(answers).missing[0] ?? null,
  );
  const toggle = (n: number) => setOpen((prev) => (prev === n ? null : n));

  const queryClient = useQueryClient();
  // Only the rep's own edits are saved — never the snapshot we mounted with.
  // Saving that would let a remount (step change, or the second layout copy
  // of the panel) overwrite newer answers with the lead as it was at page open.
  const dirtyRef = useRef(false);
  const { mutate: persist, mutateAsync: persistNow } = useMutation({
    scope: { id: `funding-check-${lead.id}` },
    retry: 1,
    mutationFn: async (snapshot: EligibilityFlags) => {
      if (lead.id !== PRACTICE_LEAD_ID) {
        await saveEligibilityFn({ data: { leadId: lead.id, answers: snapshot } });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["call-lead", lead.id] }),
    onError: () => {
      dirtyRef.current = true;
    },
  });
  const saveNow = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    persist(drafts.get(lead.id) ?? answersRef.current);
  }, [lead.id, persist]);

  // Debounced save on every change so a dropped call doesn't lose answers.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(saveNow, 700);
    return () => clearTimeout(t);
  }, [answers, saveNow]);

  // Flush a pending edit if the step unmounts before the debounce fires.
  useEffect(() => () => saveNow(), [saveNow]);

  const result = useMemo(() => computeEligibility(answers), [answers]);
  const askAboutCash = result.verdict !== "eligible";
  const { data: personalSavings } = useQuery({
    queryKey: ["client-assets", lead.id],
    queryFn: () => fetchClientAssets(lead.id),
    enabled: askAboutCash && lead.id !== PRACTICE_LEAD_ID,
    select: (saved) => saved && calculateClientAssets(saved.calculation).personalSavings,
    retry: false,
  });

  const set = (patch: Partial<EligibilityFlags>, clear: (keyof EligibilityFlags)[] = []) => {
    dirtyRef.current = true;
    setAnswers((prev) => {
      const next = { ...(drafts.get(lead.id) ?? prev), ...patch };
      for (const key of clear) delete next[key];
      if ("q8" in patch) {
        delete next.other_asset_value;
        delete next.pool_checked;
        if (patch.q8?.answer !== "yes" || patch.q8.business_value !== prev.q8?.business_value)
          delete next.business_valued;
      }
      if (next.property_status !== "open" || next.signed_papers !== "yes") delete next.signed_scope;
      if (next.q9_out_of_time === "existing_order" && !canConfirmExistingOrder(next))
        delete next.q9_out_of_time;
      if (next.q2_bankrupt === "yes") delete next.funding_issue;
      if ("property_status" in patch && next.repayment_source === "none")
        delete next.repayment_source;
      if (next.property_status !== "payout_to_caller") delete next.agreed_cash_amount;
      drafts.set(lead.id, next);
      return next;
    });
  };

  const titles = titlesOf(answers);
  const q8 = answers.q8 ?? { answer: "no" as const, business_value: 0, money_with_lawyer: 0 };
  const verdict = VERDICT_STYLES[result.verdict];

  const applicableCount = TOTAL_QUESTIONS - [2, 4].filter((n) => !isApplicable(answers, n)).length;
  const answeredCount = applicableCount - result.missing.length;
  const progress = Math.round((answeredCount / applicableCount) * 100);

  const yesNo = (v: string | undefined) =>
    v === "yes" ? "Yes" : v === "no" ? "No" : v === "unsure" ? "I’m not sure" : undefined;

  const panelRef = useRef<HTMLDivElement>(null);
  const [showResult, setShowResult] = useState(false);
  const [resetState, setResetState] = useState<"closed" | "confirm" | "saving" | "error">("closed");
  const focusAfterReset = useRef(false);
  const cashAccess =
    answers.cash_access ??
    (typeof answers.cash_for_fees === "number"
      ? answers.cash_for_fees > 0
        ? "yes"
        : "no"
      : undefined);
  const cashAmountAvailable =
    cashAccess === "yes" ||
    (cashAccess === "depends" &&
      (answers.cash_range_access === "all" || answers.cash_range_access === "some"));
  const confirmedNeed = answers.fee_estimate_confirmed ? answers.funding_needed : undefined;
  const status = answers.property_status;
  const agreementStatus =
    status && status in AGREEMENT_STATUS ? (status as keyof typeof AGREEMENT_STATUS) : undefined;
  const stage =
    status === "awaiting_payout"
      ? "agreed"
      : needsSettlementUpdate(answers)
        ? undefined
        : status && status in PROPERTY_STAGE
          ? (status as keyof typeof PROPERTY_STAGE)
          : agreementStatus
            ? "agreed"
            : undefined;

  // Move focus only after the accordion has its final height. Focusing the old
  // layout first scrolls the next heading far below where it ends up.
  function focusInPanel(selector: string) {
    const target = panelRef.current?.querySelector<HTMLElement>(selector);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
  function viewResult() {
    flushSync(() => setShowResult(true));
    focusInPanel(".funding-result-title");
  }
  function goToQuestion(n: number) {
    flushSync(() => {
      setShowResult(false);
      setOpen(n);
    });
    focusInPanel(`[data-funding-question="${n}"]`);
  }
  function nextQuestion(current: number) {
    for (let n = current + 1; n <= TOTAL_QUESTIONS; n++) {
      if (isApplicable(answers, n)) return goToQuestion(n);
    }
    viewResult();
  }

  async function resetAnswers() {
    setResetState("saving");
    saveNow();
    try {
      // The per-lead mutation queue finishes any earlier autosave before this reset.
      await persistNow({});
    } catch {
      setResetState("error");
      return;
    }
    dirtyRef.current = false;
    drafts.set(lead.id, {});
    setAnswers({});
    setOpen(1);
    setShowResult(false);
    focusAfterReset.current = true;
    setResetState("closed");
  }

  const header = (
    <div className="funding-header">
      <div className="funding-topline">
        <h3>JustFund funding check</h3>
        {showResult ? (
          <button
            type="button"
            className="funding-link"
            onClick={() => goToQuestion(open ?? result.missing[0] ?? 1)}
          >
            Back to question {open ?? result.missing[0] ?? 1}
          </button>
        ) : (
          <button type="button" className="funding-link" onClick={viewResult}>
            View result <ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="funding-progress">
        <span>
          {answeredCount} of {applicableCount} answered
        </span>
        <div
          className="funding-track"
          role="progressbar"
          aria-label="Funding questions answered"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={applicableCount}
        >
          <div style={{ width: `${progress}%` }} />
        </div>
        <AlertDialog
          open={resetState !== "closed"}
          onOpenChange={(next) => {
            if (resetState !== "saving") setResetState(next ? "confirm" : "closed");
          }}
        >
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label="Reset funding answers"
              title="Reset funding answers"
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              if (focusAfterReset.current) {
                event.preventDefault();
                focusAfterReset.current = false;
                focusInPanel('[data-funding-question="1"]');
              }
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Reset this funding check?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears this caller’s funding answers, cash backup and result so you can start
                again at question 1. Savings recorded in Discovery are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {resetState === "error" && (
              <p role="alert" className="text-sm text-destructive">
                Couldn’t save the reset. Try again in a moment.
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetState === "saving"}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={resetState === "saving"}
                onClick={resetAnswers}
              >
                {resetState === "saving" ? "Resetting…" : "Reset answers"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  const rows = (
    <div className="funding-questions">
      <Row
        n={1}
        question="Have you and your ex separated?"
        answer={
          result.missing.includes(1)
            ? undefined
            : answers.q3_separated === "yes" && answers.property_status
              ? [
                  "Yes",
                  PROPERTY_STATUS[answers.property_status],
                  (answers.signed_papers === "unsure" ||
                    (answers.signed_papers === "yes" && answers.signed_document === "unsure")) &&
                    "Paperwork unclear",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : yesNo(answers.q3_separated)
        }
        applicable
        open={open === 1}
        onToggle={() => toggle(1)}
        onNext={() => nextQuestion(1)}
      >
        <Choice
          label="Answer"
          summary="Separated"
          value={answers.q3_separated}
          options={YES_NO_UNSURE}
          onChange={(v) => {
            set({ q3_separated: v }, ["signed_papers", "signed_document", "property_status"]);
          }}
        />
        {answers.q3_separated === "yes" && (
          <div className="funding-followups mt-3">
            <Choice
              label="Since you separated, have you signed any property paperwork, or has a court made property orders?"
              summary="Signed paperwork"
              value={answers.signed_papers}
              options={YES_NO_UNSURE}
              onChange={(v) => set({ signed_papers: v }, ["signed_document", "property_status"])}
            />
            {answers.signed_papers === "yes" && (
              <Choice
                label="What kind of paperwork was it?"
                summary="What was signed"
                value={answers.signed_document}
                options={DOCUMENTS}
                onChange={(v) => set({ signed_document: v }, ["property_status"])}
              />
            )}
            {answers.signed_papers &&
              (answers.signed_papers !== "yes" || answers.signed_document) && (
                <>
                  <Choice
                    label="Has it been decided who gets what?"
                    summary="Who gets what"
                    showOptions={stage !== "agreed"}
                    value={stage}
                    options={PROPERTY_STAGE}
                    onChange={(v) => set({ property_status: v })}
                  />
                  {needsSettlementUpdate(answers) && (
                    <p className="funding-note">
                      Confirm what is still to be divided and who any payment is for.
                    </p>
                  )}
                  {status === "open" && answers.signed_papers === "yes" && (
                    <Choice
                      label="After that paperwork, can you identify property or money you still need to divide?"
                      value={answers.signed_scope}
                      options={{
                        remaining: "Yes, I can identify what’s left",
                        reopen: "I want to change the earlier split",
                        settled: "It’s all been divided and paid",
                        unsure: "I’d need to check the paperwork",
                      }}
                      onChange={(v) =>
                        v === "reopen" || v === "settled"
                          ? set({ property_status: v })
                          : set({ signed_scope: v })
                      }
                    />
                  )}
                  {stage === "agreed" && (
                    <Choice
                      label="What do you still need help with?"
                      showOptions
                      value={agreementStatus}
                      options={AGREEMENT_STATUS}
                      onChange={(v) => set({ property_status: v })}
                    />
                  )}
                  {status === "payout_to_caller" && (
                    <details className="funding-notes">
                      <summary>If they have a written payout amount</summary>
                      <Money
                        label="Does the agreement or order say how much you’ll be paid?"
                        value={answers.agreed_cash_amount}
                        onChange={(v) => set({ agreed_cash_amount: v })}
                        onClear={() => set({}, ["agreed_cash_amount"])}
                      />
                      <p>Leave blank if they don’t have the figure in front of them.</p>
                    </details>
                  )}
                </>
              )}
          </div>
        )}
      </Row>

      <Row
        n={2}
        question="Can I check the timing of your divorce or separation?"
        answer={
          result.missing.includes(2)
            ? undefined
            : answers.q9_out_of_time &&
              {
                no: "Within the usual time or still married",
                yes: "Past the usual time",
                unsure: "Dates unclear",
                existing_order: "Payment already ordered",
              }[answers.q9_out_of_time]
        }
        applicable={isApplicable(answers, 2)}
        open={open === 2}
        onToggle={() => toggle(2)}
        onNext={() => nextQuestion(2)}
      >
        <div className="funding-date-prompts">
          <p>
            <strong>If they were married</strong> Has it been more than a year since your divorce
            became final?
          </p>
          <p>
            <strong>If they were de facto</strong> Has it been more than two years since you
            separated?
          </p>
        </div>
        <Choice
          label="Answer"
          value={answers.q9_out_of_time}
          options={
            canConfirmExistingOrder(answers)
              ? {
                  ...YES_NO_UNSURE,
                  existing_order:
                    "The court already ordered my payment. I just need it carried out.",
                }
              : YES_NO_UNSURE
          }
          onChange={(v) => {
            set({ q9_out_of_time: v }, ["timing_cleared"]);
          }}
        />
        {answers.q9_out_of_time === "yes" && (
          <div className="mt-3">
            <Choice
              label="Did you apply to the court about the property before then, or has the court given you permission to apply later?"
              options={YES_NO_UNSURE}
              value={answers.timing_cleared}
              onChange={(v) => set({ timing_cleared: v })}
            />
          </div>
        )}
      </Row>

      <Row
        n={3}
        question="Do you or your ex own a house, unit or land in Australia?"
        answer={
          result.missing.includes(3)
            ? undefined
            : answers.q4_property_in_au === "no_property"
              ? "No property"
              : [
                  yesNo(answers.q4_property_in_au),
                  answers.house_plan && HOUSE_PLANS[answers.house_plan],
                ]
                  .filter(Boolean)
                  .join(" · ")
        }
        applicable
        open={open === 3}
        onToggle={() => toggle(3)}
        onNext={() => nextQuestion(3)}
      >
        <Choice
          label="Answer"
          summary="Property in Australia"
          value={answers.q4_property_in_au}
          options={{
            yes: "Yes",
            no: "Only outside Australia",
            no_property: "We don’t own any property",
            unsure: "I’m not sure",
          }}
          onChange={(v) => {
            set({ q4_property_in_au: v }, [
              "house_plan",
              "q5_title",
              "q6_other_owner",
              "q7",
              "equity_unknown",
            ]);
          }}
        />
        {hasRealEstate(answers) && (
          <Choice
            label="What do you think will happen to the property?"
            summary="Plans for the house"
            value={answers.house_plan}
            options={HOUSE_PLANS}
            onChange={(v) => {
              set({ house_plan: v });
            }}
          />
        )}
      </Row>

      <Row
        n={4}
        question="Who owns the Australian property, and what is it worth after debts?"
        answer={
          result.missing.includes(4)
            ? undefined
            : [
                titles.map((t) => TITLE_LABELS[t]).join(", "),
                answers.equity_unknown ? "Equity unknown" : formatAud(netEquityOf(answers)),
                answers.q6_other_owner === "yes" && "Another owner",
              ]
                .filter(Boolean)
                .join(" · ")
        }
        applicable={isApplicable(answers, 4)}
        open={open === 4}
        onToggle={() => toggle(4)}
        onNext={() => nextQuestion(4)}
      >
        <fieldset className="funding-choice">
          <legend>Whose names are on the property title?</legend>
          <div className="funding-options">
            {(Object.keys(TITLE_LABELS) as TitleOption[]).map((title) => (
              <label key={title} className="funding-option">
                <input
                  type="checkbox"
                  checked={titles.includes(title)}
                  onChange={(e) =>
                    set({
                      q5_title: e.target.checked
                        ? title === "unsure"
                          ? ["unsure"]
                          : [...titles.filter((t) => t !== "unsure"), title]
                        : titles.filter((t) => t !== title),
                    })
                  }
                />
                <span>{TITLE_LABELS[title]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {titles.length > 0 && (
          <div className="mt-3">
            <Choice
              label="Does anyone besides you and your ex own a share?"
              value={answers.q6_other_owner}
              options={{ no: "No", yes: "Yes", unsure: "I’m not sure" }}
              onChange={(v) => {
                set({ q6_other_owner: v });
              }}
            />
          </div>
        )}
        <div className="mt-3 max-w-md">
          <Money
            label="After the mortgage and other property debts are paid, how much would be left for you and your ex together?"
            allowNegative
            value={recordedEquity(answers)}
            onChange={(n) => {
              set({ q7: { net_equity: n } }, ["equity_unknown"]);
            }}
            onClear={() => set({}, ["q7"])}
          />
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={answers.equity_unknown === true}
              onChange={(e) => set({ equity_unknown: e.target.checked }, ["q7"])}
            />
            I’m not sure how much is left after debts
          </label>
        </div>
      </Row>

      <Row
        n={5}
        question="Does either of you own a business, or is a lawyer holding money from your property settlement?"
        answer={
          result.missing.includes(5)
            ? undefined
            : answers.q8?.answer === "yes"
              ? `Yes · ${formatAud(q8.business_value)} business · ${formatAud(q8.money_with_lawyer)} with lawyer`
              : yesNo(answers.q8?.answer)
        }
        applicable
        open={open === 5}
        onToggle={() => toggle(5)}
        onNext={() => nextQuestion(5)}
      >
        <Choice
          label="Answer"
          value={answers.q8?.answer}
          options={{ no: "No", yes: "Yes", unsure: "I’m not sure" }}
          onChange={(v) => {
            set({
              q8: { answer: v, business_value: 0, money_with_lawyer: 0 },
            });
          }}
        />
        {q8.answer === "yes" ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <Money
              label="Business value after its debts"
              value={q8.business_value}
              onChange={(n) => {
                set({ q8: { ...q8, business_value: n } });
              }}
              onClear={() => set({ q8: { ...q8, business_value: 0 } })}
            />
            <Money
              label="Money held by a lawyer"
              value={q8.money_with_lawyer}
              onChange={(n) => {
                set({ q8: { ...q8, money_with_lawyer: n } });
              }}
              onClear={() => set({ q8: { ...q8, money_with_lawyer: 0 } })}
            />
          </div>
        ) : null}
        {q8.answer === "yes" && (
          <p className="funding-note">
            Count each asset once. Include money a lawyer or conveyancer holds in Australia for the
            split. Leave out money already set aside for fees or someone else.
          </p>
        )}
        {q8.answer === "yes" && q8.business_value > 0 && (
          <Choice
            label="Has an independent valuer given you that business figure?"
            options={YES_NO_UNSURE}
            value={answers.business_valued}
            onChange={(v) => set({ business_valued: v })}
          />
        )}
        {q8.answer === "yes" && !q8.business_value && !q8.money_with_lawyer && (
          <div className="mt-3">
            <Choice
              label="Is there any value left after debts?"
              options={{ zero: "There’s nothing left", unknown: "I don’t know the value yet" }}
              value={answers.other_asset_value}
              onChange={(v) => set({ other_asset_value: v })}
            />
          </div>
        )}
        {needsOtherAssetCheck(answers) && (
          <div className="mt-3">
            <Choice
              label="Are those amounts just for you and your ex, after any business debts?"
              options={YES_NO_UNSURE}
              value={answers.pool_checked}
              onChange={(v) => set({ pool_checked: v })}
            />
          </div>
        )}
      </Row>

      <Row
        n={6}
        question="Are you an Australian citizen or permanent resident?"
        answer={result.missing.includes(6) ? undefined : yesNo(answers.q1_resident)}
        applicable
        open={open === 6}
        onToggle={() => toggle(6)}
        onNext={() => nextQuestion(6)}
      >
        <Choice
          label="Answer"
          value={answers.q1_resident}
          options={YES_NO_UNSURE}
          onChange={(v) => {
            set({ q1_resident: v });
          }}
        />
        {answers.q1_resident && (
          <Choice
            label="Are you 18 or over, and do you usually live in Australia?"
            options={{
              adult_au: "Yes to both",
              adult_overseas: "I’m 18 or over and live overseas",
              under_18: "I’m under 18",
              unsure: "I’m not sure",
            }}
            value={answers.applicant_profile}
            onChange={(v) => set({ applicant_profile: v })}
          />
        )}
      </Row>

      <Row
        n={7}
        question="Are you currently bankrupt?"
        answer={
          result.missing.includes(7)
            ? undefined
            : answers.q2_bankrupt === "discharged"
              ? "Discharged"
              : yesNo(answers.q2_bankrupt)
        }
        applicable
        open={open === 7}
        onToggle={() => toggle(7)}
        onNext={() => nextQuestion(7)}
      >
        <Choice
          label="Answer"
          value={answers.q2_bankrupt}
          options={{
            no: "No",
            discharged: "My bankruptcy has ended",
            yes: "Yes",
            unsure: "I’m not sure",
          }}
          onChange={(v) => {
            set({ q2_bankrupt: v });
          }}
        />
        {answers.q2_bankrupt && answers.q2_bankrupt !== "yes" && (
          <>
            <Choice
              label="Is there anything else that could stop you using the settlement money when the case ends?"
              options={{
                none: "Nothing else that I know of",
                details: "Yes",
                unsure: "I’m not sure",
              }}
              value={
                !answers.funding_issue ||
                answers.funding_issue === "none" ||
                answers.funding_issue === "unsure"
                  ? answers.funding_issue
                  : "details"
              }
              onChange={(v) => set({ funding_issue: v })}
            />
            {answers.funding_issue &&
              answers.funding_issue !== "none" &&
              answers.funding_issue !== "unsure" && (
                <Choice
                  label="What’s the main thing getting in the way?"
                  options={ISSUE_DETAILS}
                  value={answers.funding_issue === "details" ? undefined : answers.funding_issue}
                  onChange={(v) => set({ funding_issue: v })}
                />
              )}
          </>
        )}
      </Row>
    </div>
  );

  const readAloud =
    result.reason ??
    "I have a few more questions before I can tell you whether funding looks likely.";
  const resultBlock = (
    <section className="funding-result">
      <div className="funding-result-kicker">JustFund preliminary result</div>
      <h4 className="funding-result-title" tabIndex={-1} aria-live="polite">
        <span aria-hidden="true" className={`funding-status-dot ${verdict.dot}`} />
        {result.code === "no_loan_needed" ? "No loan requested" : verdict.label}
      </h4>
      <div className="funding-script">
        <div className="funding-script-label">
          <MessageSquare aria-hidden="true" />
          Say to the caller
        </div>
        <p>{readAloud}</p>
      </div>
      {askAboutCash && (
        <div className="funding-budget">
          <Choice
            label="If funding falls through or only covers part of your fees, do you have access to money to pay the rest yourself?"
            options={{
              yes: "Yes",
              no: "No",
              depends: "Depends on the cost or how long it takes",
              unsure: "Not sure yet",
            }}
            value={cashAccess}
            onChange={(v) =>
              set({ cash_access: v, cash_for_fees: v === "no" ? 0 : null }, ["cash_range_access"])
            }
          />
          {cashAccess === "depends" && (
            <div className="funding-followups mt-3">
              <p className="funding-note">
                As an example, a property dispute could cost $30,000 to $40,000. Yours could cost
                less or more. The lawyer can give you an estimate at the consultation.
              </p>
              <Choice
                label="If it came to that, would you have access to that money?"
                options={{
                  all: "Yes, the full amount",
                  some: "Some of it",
                  none: "No money available",
                  unsure: "I’m not sure yet",
                }}
                value={answers.cash_range_access}
                onChange={(v) =>
                  set({ cash_range_access: v, cash_for_fees: v === "none" ? 0 : null })
                }
              />
              {!answers.cash_range_access && typeof answers.cash_for_fees === "number" && (
                <p className="funding-note">
                  Previously mentioned: {formatAud(answers.cash_for_fees)}. Confirm how much they
                  can access.
                </p>
              )}
            </div>
          )}
          {cashAmountAvailable && (
            <Money
              label="Roughly how much money could you access to pay your legal fees?"
              value={answers.cash_for_fees ?? undefined}
              onChange={(v) => set({ cash_access: cashAccess, cash_for_fees: v })}
              onClear={() => set({ cash_access: cashAccess, cash_for_fees: null })}
            />
          )}
          {cashAccess === "unsure" && (
            <p className="funding-note">
              That’s okay. The lawyer can talk you through the likely cost at your consultation, and
              you can decide what’s manageable then.
            </p>
          )}
          {personalSavings != null && (
            <p className="funding-note">
              Personal savings recorded in Discovery: {assetMoney(personalSavings)}.
            </p>
          )}
          {typeof confirmedNeed === "number" &&
            confirmedNeed > 0 &&
            (cashAmountAvailable || cashAccess === "no" || answers.cash_range_access === "none") &&
            typeof answers.cash_for_fees === "number" && (
              <p className="funding-note">
                {answers.cash_for_fees >= confirmedNeed
                  ? "The amount they can access covers the amount discussed."
                  : `For the amount discussed, another ${formatAud(confirmedNeed - answers.cash_for_fees)} would be needed if funding falls through.`}
              </p>
            )}
        </div>
      )}
      <details className="funding-notes">
        <summary>If they already have a lawyer’s estimate</summary>
        <p>
          Only record an amount if the caller has a fee estimate and tells you how much of it they
          want funded.
        </p>
        {answers.fee_estimate_confirmed !== true && typeof answers.funding_needed === "number" && (
          <p>
            Previously discussed: {formatAud(answers.funding_needed)}. Check it against the lawyer’s
            estimate before using it.
          </p>
        )}
        <Money
          label="Amount they want funded from that estimate"
          value={confirmedNeed ?? undefined}
          onChange={(value) => set({ funding_needed: value, fee_estimate_confirmed: true })}
          onClear={() => set({}, ["funding_needed", "fee_estimate_confirmed"])}
        />
      </details>
      {(result.missing.length > 0 ||
        result.flags.length > 0 ||
        result.verdict !== "incomplete") && (
        <details className="funding-notes">
          <summary>Screening details</summary>
          {typeof confirmedNeed === "number" ? (
            <p>Amount requested against a fee estimate: {formatAud(confirmedNeed)}</p>
          ) : (
            <p>
              Fees to be discussed at the consultation. The amount the lender might cover is still
              open.
            </p>
          )}
          <p>
            JustFund checks the likely settlement, legal fees, repayment and any claims on the
            assets with the caller’s lawyer. If there’s a mortgage, its checklist asks for a
            statement from the last six months. JustFund makes the lending decision.
          </p>
          {result.missing.length > 0 && <p>Still to answer: {result.missing.join(", ")}</p>}
          {!(answers.q4_property_in_au === "yes" && answers.equity_unknown) &&
            ![3, 4, 5].some((n) => result.missing.includes(n)) && (
              <p>Combined assets after debts: {formatAud(result.netPool)}</p>
            )}
          {result.verdict === "equity_assist" && <p>{EQUITY_ASSIST_NOTE}</p>}
          {result.flags.length > 0 && (
            <ul>
              {result.flags.map((f) => (
                <li key={f.code}>{f.label}</li>
              ))}
            </ul>
          )}
        </details>
      )}
    </section>
  );

  const panel = (
    <div ref={panelRef} className="funding-panel">
      {header}
      <div hidden={showResult}>{rows}</div>
      {showResult && resultBlock}
    </div>
  );

  if (embedded) return panel;
  return (
    <StepShell eyebrow="Litigation Funding" heading="Litigation Funding Eligibility">
      {panel}
    </StepShell>
  );
}

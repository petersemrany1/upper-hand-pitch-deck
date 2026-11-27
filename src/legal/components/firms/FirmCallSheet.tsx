// Ported from the Legal app (family-law-floater/src/components/firms/FirmCallSheet.tsx). Re-run the port script to refresh.
import { FIRM_CALL_ANSWER_LABELS } from "@/legal/lib/firm-calling";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveFirmCallSheet, type getFirmCallWorkspace } from "@/legal/lib/firm-calling.functions";
import { useFirmAutosave, firmSaveLabel } from "@/legal/hooks/use-firm-autosave";
import { FirmAutosavedNotes } from "./FirmAutosavedNotes";
import { FirmMatterValueCalculator } from "./FirmMatterValueCalculator";
import { matterValuePatch, readMatterValueInputs } from "@/legal/lib/firm-matter-value";

const tabs = ["Prepare", "Opener", "Discovery", "Our offer", "Next step", "Price"] as const;

export function FirmCallSheet({
  applicationId,
  userId,
  initialAnswers,
  contactName,
  repName,
  onSavingChange,
}: {
  applicationId: string;
  userId: string;
  initialAnswers: Record<string, string>;
  contactName: string;
  repName: string;
  onSavingChange: (unprotected: boolean) => void;
}) {
  const [tab, setTab] = useState(0);
  const tabsId = useId();
  const scriptRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const selectTab = (index: number) => {
    setTab(index);
    scriptRef.current?.scrollTo?.({ top: 0 });
  };
  useEffect(() => {
    tabListRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [tab]);
  const save = useServerFn(saveFirmCallSheet);
  const client = useQueryClient();
  const saveAnswers = async (patch: Record<string, string>) => {
    await save({ data: { applicationId, patch } });
    client.setQueryData<Awaited<ReturnType<typeof getFirmCallWorkspace>>>(
      ["firm-call-workspace", applicationId],
      (current) => (current ? { ...current, answers: { ...current.answers, ...patch } } : current),
    );
  };
  // Recover any pending answers from the previous form without requiring users to fill it out.
  const previous = useFirmAutosave(
    `firm-call-sheet:v1:${userId}:${applicationId}`,
    initialAnswers,
    saveAnswers,
  );
  // The notepad and calculator share one queue, so applying an estimate cannot
  // overwrite a newer note or save its inputs separately from the explanation.
  const notes = useFirmAutosave(
    `firm-notes:v1:${userId}:${applicationId}`,
    {
      team_notes: initialAnswers["team_notes"] ?? "",
      matter_value: initialAnswers["matter_value"] ?? "",
      matter_value_calculation: initialAnswers["matter_value_calculation"] ?? "",
    },
    saveAnswers,
  );
  const savedCalculation = readMatterValueInputs(notes.answers["matter_value_calculation"]);
  useEffect(() => {
    onSavingChange(!previous.protected || !notes.protected);
  }, [previous.protected, notes.protected, onSavingChange]);
  const earlier = Object.entries({ ...previous.answers, ...notes.answers }).filter(
    ([key, value]) => !["team_notes", "matter_value_calculation"].includes(key) && value.trim(),
  );
  return (
    <div className="crm-call-readalong">
      <div
        className="crm-call-tabs"
        role="tablist"
        aria-label="Call guide sections"
        ref={tabListRef}
        onKeyDown={(event) => {
          let next: number;
          if (event.key === "ArrowRight") next = (tab + 1) % tabs.length;
          else if (event.key === "ArrowLeft") next = (tab + tabs.length - 1) % tabs.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabs.length - 1;
          else return;
          event.preventDefault();
          selectTab(next);
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}
      >
        {tabs.map((title, index) => (
          <button
            key={title}
            type="button"
            role="tab"
            id={`${tabsId}-tab-${index}`}
            aria-controls={`${tabsId}-panel-${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => selectTab(index)}
          >
            <span aria-hidden="true">{index + 1}</span>
            {title}
          </button>
        ))}
      </div>
      <div
        className="crm-readalong-scroll"
        role="region"
        aria-label={`${tabs[tab]} script`}
        ref={scriptRef}
        tabIndex={0}
      >
        <Section number={1} title="Prepare" active={tab === 0} idBase={tabsId}>
          <p className="crm-coach-note">Look at their website before you call.</p>
          <ul className="crm-readalong-questions">
            <Question>What are their Google reviews like?</Question>
            <Question>How many people are in their team?</Question>
            <Question>Where are they located?</Question>
            <Question>Who looks like the decision maker?</Question>
          </ul>
        </Section>
        <Section number={2} title="Opener" active={tab === 1} idBase={tabsId}>
          <Script>
            Hi {contactName || "[NAME]"}, it’s {repName || "[rep name]"} from Bold. How are you?
          </Script>
          <p className="crm-coach-note">Pause and let them answer.</p>
          <Script>
            Good, thanks. Thanks for submitting a form on our ad about vetted family law clients.
            You’re looking for some more family law clients, are you?
          </Script>
        </Section>
        <Section number={3} title="Discovery" active={tab === 2} idBase={tabsId}>
          <QuestionGroup title="Current setup" start={1}>
            <Question hint="If referrals: “Word of mouth is great. The tricky part is being able to dial it up when you need more work.”">
              What are you currently doing to get new clients?
            </Question>
            <Question hint="“Do they initially meet with you? And then what happens?”">
              When an enquiry comes in, what’s the process?
            </Question>
            <Question>In person or Zoom?</Question>
            <Question>What do you charge for the first meeting?</Question>
            <Question>How long have you been doing this?</Question>
          </QuestionGroup>
          <QuestionGroup title="Their numbers" start={6}>
            <Question>How many family law matters come through each month?</Question>
            <Question
              hint="Exclude consent orders / BFAs that only formalise an agreed deal. Use the calculator if unsure."
              action={
                <FirmMatterValueCalculator
                  saved={savedCalculation}
                  onApply={(inputs) => {
                    const patch = matterValuePatch(
                      notes.answers["team_notes"] ?? "",
                      inputs,
                      savedCalculation,
                    );
                    notes.changeMany(patch);
                    void notes.flush();
                  }}
                />
              }
            >
              For negotiation, mediation or court matters, what’s the average matter worth?
            </Question>
            <Question>Out of 10 people who can afford you, how many sign?</Question>
            <Question>Do you offer litigation funding, like JustFund?</Question>
            <Question>How many additional matters would you like each month?</Question>
          </QuestionGroup>
          <QuestionGroup title="Why they’re looking" start={11}>
            <Question hint="“You’ve been running for [X time]. What’s got you looking into this now?”">
              Why now?
            </Question>
          </QuestionGroup>
        </Section>
        <Section number={4} title="Our offer" active={tab === 3} idBase={tabsId}>
          <Script>Have you heard about us before, or is this your first time?</Script>
          <p className="crm-coach-note">Pause and let them answer.</p>
          <Script>
            We started as a traditional marketing company. We were generating thousands of leads,
            but firms still weren’t getting the quality they needed. So we niched down to family law
            and built a pay-per-show model.
          </Script>
          <Script>
            The missing step was qualification. We run our own ads, with our own in-house actors and
            studio. Then our Australian sales team spends 40 minutes to an hour on the phone doing a
            deep discovery.
          </Script>
          <div className="crm-offer-checks">
            <p>We check three things:</p>
            <ol>
              <li>
                <strong>They can afford a lawyer.</strong> We look for at least $750,000 in assets
                and likely eligibility for JustFund, or $50,000 or more in cash available to fund
                their matter.
              </li>
              <li>
                <strong>They know how they’ll fund it.</strong>
              </li>
              <li>
                <strong>They know your price.</strong> We tell them upfront what you charge.
              </li>
            </ol>
          </div>
          <Script>
            They also need to be ready to act now. We ask for a $75 booking fee to make sure they’re
            serious, then book them into your calendar. You only pay when they show up.
          </Script>
        </Section>
        <Section number={5} title="Next step" active={tab === 4} idBase={tabsId}>
          <p className="crm-coach-note">Only confirm capacity once it’s been checked.</p>
          <Script>
            We’ve had an enormous influx of lawyers responding to our ads. So I guess the goal today
            is to understand your firm and what you’re trying to achieve.
          </Script>
          <Script>I’ll take this back to the team and go through it with them.</Script>
          <Script>
            In the meantime, let’s book a Zoom so you can meet Peter, who I report to. He’s the best
            person to answer any final questions and discuss possible next steps.
          </Script>
          <Script>We’ll prepare a proposal for that meeting.</Script>
          <Script>Will you be making the decision, or should anyone else join us?</Script>
          <Script>Let me check Peter’s availability. What time works best for you?</Script>
          <p className="crm-coach-note">
            Before booking: confirm all decision makers can attend. Record the time and next
            actions, then send the invite.
          </p>
        </Section>
        <Section number={6} title="Price" active={tab === 5} idBase={tabsId}>
          <Script>
            Based on what you’ve said about your pricing, process and conversion, I really think
            you’d be a good fit.
          </Script>
          <Script>
            As you would have seen on the ad, it’s $1,850 plus GST per show, and the packs are
            prepaid. Based on you wanting [X] more matters a month, I’d recommend starting with [10,
            20 or 50] shows. Most firms start with either [X] or [X].
          </Script>
          <div className="crm-offer-checks">
            <p>
              <strong>Before you finish</strong>
            </p>
            <ul className="crm-next-step-checklist">
              <li>
                <span aria-hidden="true">☐</span>
                <strong>They know the price and know it’s prepaid.</strong>
              </li>
            </ul>
          </div>
        </Section>
        {tab === 0 && earlier.length > 0 && (
          <details className="crm-prep-reference crm-previous-answers">
            <summary>Earlier saved answers</summary>
            {earlier.map(([key, value]) => (
              <p key={key}>
                <strong>{FIRM_CALL_ANSWER_LABELS[key] ?? key.replaceAll("_", " ")}:</strong> {value}
              </p>
            ))}
            {previous.status !== "saved" && (
              <button
                type="button"
                className="crm-save-status"
                onClick={() => void previous.flush()}
              >
                {firmSaveLabel(previous.status, previous.protected)}
              </button>
            )}
          </details>
        )}
        <nav className="crm-readalong-navigation" aria-label="Continue call guide">
          {tab > 0 && (
            <button
              type="button"
              aria-label={`Previous section: ${tabs[tab - 1]}`}
              onClick={() => {
                selectTab(tab - 1);
                tabListRef.current
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [tab - 1]?.focus();
              }}
            >
              <span aria-hidden="true">←</span> {tabs[tab - 1]}
            </button>
          )}
          {tab < tabs.length - 1 && (
            <button
              type="button"
              className="crm-readalong-next"
              aria-label={`Next section: ${tabs[tab + 1]}`}
              onClick={() => {
                selectTab(tab + 1);
                tabListRef.current
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [tab + 1]?.focus();
              }}
            >
              Next: {tabs[tab + 1]} <span aria-hidden="true">→</span>
            </button>
          )}
        </nav>
      </div>
      <aside className="crm-readalong-notes" aria-label="Call notepad">
        <FirmAutosavedNotes form={notes} />
      </aside>
    </div>
  );
}
function Section({
  number,
  title,
  active,
  idBase,
  children,
}: {
  number: number;
  title: string;
  active: boolean;
  idBase: string;
  children: ReactNode;
}) {
  return (
    <section
      className="crm-readalong-section"
      role="tabpanel"
      hidden={!active}
      id={`${idBase}-panel-${number - 1}`}
      aria-labelledby={`${idBase}-tab-${number - 1}`}
      tabIndex={0}
    >
      <h3>
        <span>{number}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
function Question({
  children,
  hint,
  action,
}: {
  children: ReactNode;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <li>
      <p>{children}</p>
      {hint && <p className="crm-question-hint">{hint}</p>}
      {action}
    </li>
  );
}
function QuestionGroup({
  title,
  start,
  children,
}: {
  title: string;
  start: number;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="crm-discovery-group" aria-labelledby={id}>
      <h4 id={id}>{title}</h4>
      <ol className="crm-readalong-questions" start={start}>
        {children}
      </ol>
    </section>
  );
}
function Script({ children }: { children: ReactNode }) {
  return (
    <div className="crm-script">
      <p>“{children}”</p>
    </div>
  );
}

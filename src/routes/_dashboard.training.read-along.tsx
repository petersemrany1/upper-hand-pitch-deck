import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_dashboard/training/read-along")({
  component: ReadAlong,
});

const STORAGE_KEY = "htg_training_module3_complete";
const ACCENT = "#f4522d";

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "1. Why You're Here",
    body: [
      "Welcome to the Hair Transplant Group training series. Before any of the technical detail, we need to talk about why what we do matters.",
      "We are on a mission to help people living with hair loss feel like themselves again. To take someone from hiding it — from the hats, the powders, the dodging cameras — to forgetting about it entirely. That's it. That's the mission.",
      "Here's why that matters. Right now there are men walking around running a quiet, constant background program in their head. Where's the light in this room. Is the wind going to expose it. Can I take this hat off. Will it show in the photo. They've stopped going to certain events. Some have stopped dating. Some haven't let a photo be taken of them in years. It sounds dramatic until you talk to one of them — and then you realise how much of their day it actually eats.",
      "A hair transplant, done properly, gives that back. Permanently. With their own hair. Your job is not to book appointments. Your job is to help someone understand that a real, permanent solution exists for them — and to guide them to the first step. When you do that well, the bookings happen on their own. Because you're not selling a procedure. You're handing someone a way out of something they've been carrying for years.",
    ],
  },
  {
    heading: "2. The Problem — Deeper Than Your Patient",
    body: [
      "To be a great advisor you need to understand hair loss one level deeper than the person you're talking to. Not surgeon-deep. But deep enough that when someone describes what they're going through, you already understand exactly why. The people who call you fall into three broad groups.",
      "Group one — early thinning. The hairline's crept back, or the crown's started to go. They've often caught it early and they're anxious. These are frequently the heaviest concealers — fibres, powders, specific hairstyles, a cap that \"can't leave the house.\" A lot of mental energy goes into managing something most people around them haven't even clocked yet. They're not imagining it, and telling them \"you can't even notice\" is the worst thing you can do — it tells them you're not listening.",
      "Group two — established loss. Norwood three to five, in industry terms. The loss is visible now. This is affecting their life — photos, confidence, sometimes dating or work. Many have been living with it for years and have quietly normalised it, but the cost is real. This is the core group for a transplant.",
      "Group three — advanced, or burned before. Either advanced loss where they assume they're \"too far gone,\" or someone who's already tried — been on medication for years, researched Turkey, sat in a consult and balked, or worst case had a botched procedure overseas. This group is sceptical, sometimes embarrassed, and needs honesty more than enthusiasm.",
      "For all three, the underlying issue is identical: their hair loss is costing them something every single day, and they want to feel normal again. One line you'll hear constantly, in different words: \"I knew it ran in the family — but it still hit me harder than I expected.\" That gap — saw it coming, still hurts — is the emotional centre of this whole thing.",
    ],
  },
  {
    heading: "3. The One Piece of Science That Explains Everything",
    body: [
      "If you remember one thing from this entire module, remember this section. Understand it properly and almost every question a patient asks you answers itself.",
      "Most common hair loss — what's called androgenetic alopecia, or male pattern baldness — is driven by a hormone called DHT. In people who are genetically susceptible, DHT binds to the hair follicles on the top of the scalp and slowly shrinks them. Each growth cycle, the hair comes back a little thinner and finer, until eventually it stops growing altogether. That shrinking process is called miniaturisation, and it's the engine of pattern baldness. Importantly, the follicle is usually still there under the skin — it's just been shrunk into nothing.",
      "Now here's the part that makes everything we do possible. The hair on the back and sides of the head is genetically different. Those follicles are resistant to DHT. They don't shrink. And — this is the crucial bit — when a surgeon moves one of those resistant follicles up to a thinning area, it keeps its genetics. It stays resistant. It keeps growing for life, even in a spot where the original hair fell out. That principle is called donor dominance, and it is the entire foundation of modern hair transplantation. Without it, transplanted hair would just fall out like the hair it replaced. With it, transplanted hair is permanent.",
      "And one more fact that matters more than almost anything else you'll learn: the donor area is finite. A person is born with a set number of those resistant follicles on the back and sides, and there is no way to make more. A transplant doesn't grow new hair — it relocates the hair they already have. Think of it like a garden: you've got one healthy patch of strong grass, you move some of it to fill the bare dirt, you can't manufacture more, and you can only take so much before the patch behind it starts to thin. That's why a good surgeon is careful, and it's why — gently, never as a scare — the smartest time to act is usually while someone still has the most to work with.",
      "Hold those three facts together: DHT shrinks the top, the back and sides are immune, and the supply is limited. That's the whole picture.",
    ],
  },
  {
    heading: "4. What It's Actually Like to Live With",
    body: [
      "Let's be honest about the day-to-day, because this is where empathy comes from.",
      "It's the powder or the fibres every morning, and the quiet fear of rain, wind, or a swimming pool washing it away. It's choosing seats based on overhead lighting. It's the cap that goes everywhere — and on a first date, a surprising number of guys keep the hat on specifically so the other person doesn't see. It's turning slightly away when someone pulls out a camera, or just not being in the photo at all. It's catching yourself in a shop window or a lift mirror and the little drop in your stomach. It's scrolling back to an old photo and getting quietly gutted by how much has gone.",
      "For the early group it's mostly that mental load and the concealing. For the established group it's confidence — meetings, dating, feeling older than they are. For the advanced or burned group it's often resignation, or the specific shame of a job that went wrong. They won't always say this out loud on a call. Your job is to recognise it, let them know you get it, and show them there's a way through.",
    ],
  },
  {
    heading: "5. The Solution — What a Transplant Actually Is",
    body: [
      "A hair transplant is simple in principle. The surgeon takes those DHT-resistant follicles from the permanent zone at the back and sides, and relocates them — a few hairs at a time — into the thinning or bald areas up top. Because of donor dominance, that relocated hair keeps its resistant genetics, so it grows in its new home for the rest of the person's life. It's their own hair. They wash it, cut it, style it, run their hands through it. Nobody can tell.",
      "The hair is harvested in natural little groupings called follicular units — usually one to four hairs each, which is just how hair naturally grows — and each one is placed individually. The skill, and the entire difference between a result that looks \"done\" and one nobody can ever pick, is in the placement: matching the exact angle and direction the person's natural hair grows, and designing a soft, age-appropriate hairline. That's craft, not just volume.",
    ],
  },
  {
    heading: "6. Why a Transplant Beats the Alternatives",
    body: [
      "Patients will ask how it compares to everything else, so know the landscape cold.",
      "Versus concealers (fibres, powders, sprays): those are a daily performance that the rain, wind, a pillow, or a pool can ruin. A transplant is real hair that's just there.",
      "Versus medication alone: medication (finasteride, minoxidil) is genuinely useful — but its job is mostly to slow loss and protect the hair you still have, not to regrow a bald area. And it only works while you take it; stop, and the loss resumes. It's maintenance, not restoration.",
      "Versus hair systems or wigs: ongoing cost, glue, maintenance, and the constant low-grade anxiety that it isn't really yours. A transplant is permanent and it's yours.",
      "Versus doing nothing: loss is progressive. It doesn't plateau on its own.",
      "The honest, complete answer — and the one a good clinic will give — is that the best long-term result is usually a transplant to restore, plus medication to protect the native hair behind it. That combination is worth understanding, because it leads us to the single most important truth in this whole field.",
    ],
  },
  {
    heading: "7. The Truth That Protects Everyone: Ongoing Loss",
    body: [
      "Here's the thing most cheap clinics won't tell people, and the thing that separates an honest advisor from a salesperson. A transplant moves resistant hair — but it does not switch off the genetic process happening to the native hair around it. If someone is still actively losing, the hair behind a transplant can keep thinning. In fact, the number one reason a transplant ever looks \"unsuccessful\" is not the grafts failing — it's untreated native loss continuing around them.",
      "This is why expectations are everything. The data is blunt about it: the biggest driver of patient dissatisfaction in this industry isn't the surgery, it's poor communication and mismatched expectations. So we set them properly, early, gently. We tell people the truth: a transplant restores, medication protects, and the result you keep depends on managing both. Setting that expectation honestly on the phone is not a weakness in your pitch — it is the single most valuable thing you can do, because it's what makes patients happy a year later, and happy patients are what keep our clinic partners taking our calls.",
    ],
  },
  {
    heading: "8. The Options Landscape — So You Can Guide, Not Diagnose",
    body: [
      "You're not a surgeon and you never diagnose. But you need to know the landscape so you can explain it intelligently.",
      "Medication — finasteride, minoxidil, sometimes dutasteride. Slows loss, protects and can partially thicken existing hair. Ongoing. The foundation, often alongside surgery.",
      "FUE (Follicular Unit Extraction) — the modern standard. Follicles are extracted individually with a tiny punch, leaving only minuscule dot scars that are invisible at normal hair length. No linear scar, faster donor healing. Suits people who wear their hair short.",
      "FUT (the \"strip\" method) — a thin strip of scalp is removed from the back and dissected into grafts. Leaves a fine linear scar, so it suits longer hairstyles, but it allows a large number of grafts in a single session — useful for more advanced loss.",
      "DHI / implanter-pen techniques — a variation on how grafts are placed; same underlying principle.",
      "Supportive therapies — PRP, low-level laser — adjuncts some clinics use to support growth.",
      "Key fact worth knowing: FUE and FUT grow at the same rate and look the same once healed — the difference is purely in how the donor is harvested and the type of scar. The clinician recommends the right approach after assessing the donor. You don't push a method on a call.",
    ],
  },
  {
    heading: "9. Pricing (No Hard Numbers Without an Assessment)",
    body: [
      "In Australia, hair transplants are generally priced per graft, roughly five to twelve dollars a graft depending on the clinic and surgeon. Most people need somewhere between one thousand and three thousand grafts, so procedures commonly run from around seven thousand dollars up to the high teens, with premium or large cases higher again. It is not covered by Medicare or, in almost all cases, private health — it's considered cosmetic.",
      "But here's the rule, and it mirrors how the consultation works: you can't responsibly quote a real number before the donor's assessed, because the entire plan depends on what they've got to work with. Be wary of anyone who throws a price at someone off a couple of photos — that's a salesperson, not a surgeon. Funding options come later in this module.",
    ],
  },
  {
    heading: "10. Why a Real, Doctor-Led Clinic — and Why Not a Factory",
    body: [
      "This is our competitive backbone, and it's the honest answer to the elephant in every hair-loss conversation: Turkey.",
      "Turkey runs over a million of these procedures a year, with headline prices starting around two thousand dollars. For some people it works out. But there's a whole category of patients now flying home needing repair work — because at high-volume mills, the surgeon may place very few of the grafts personally, technicians do most of the work, the donor gets over-harvested to maximise graft counts, and there's effectively no follow-up care once you've flown home. Over-harvest a finite donor and you get a permanently thin, see-through back — and that damage can't be undone.",
      "What we connect patients to is the opposite. Doctor-led clinics where the surgeon performs the extractions and designs the hairline. Careful stewardship of that finite donor. Natural-angle placement. Real aftercare, locally, where you can actually walk back in. As a network, we only partner with a small number of vetted surgeons — and only one clinic per region — so a patient isn't choosing the cheapest factory, they're being matched to the right local expert for them. That's the pitch: not the cheapest hair, the right hair, done once, properly, by someone you can look in the eye.",
    ],
  },
  {
    heading: "11. The Benefits, One by One",
    body: [
      "Go through these slowly in your own head, because conviction shows up in your voice.",
      "It's permanent. Donor dominance means the transplanted hair keeps growing for life. One procedure, not a forever subscription.",
      "It's your own hair. Not a system, not fibres. Real hair growing from your own scalp.",
      "It looks completely natural when done well — matched angle, direction, density, and a soft hairline. Done right, even a barber can't tell.",
      "It behaves like normal hair — wash it, cut it, style it, swim, get caught in the rain. No routine, no products, no fear.",
      "The daily mental load disappears — no more powders, no more hat, no more managing the lighting or the wind.",
      "Confidence comes back — photos, dating, meetings. Patients describe it as feeling like themselves again.",
      "It's a one-time cost versus the endless drip of concealers, systems, and maintenance.",
      "It can be combined with medication to protect the rest, so the whole head ages well.",
      "Recovery is quicker and easier than people fear — which is the next section.",
    ],
  },
  {
    heading: "12. Candidacy — The Question Everyone's Secretly Asking",
    body: [
      "The quiet fear behind a lot of calls is \"am I even a candidate, or am I too far gone?\" Your answer here can be the difference between someone booking and someone giving up. Here's the truth, honestly framed.",
      "Candidacy comes down mainly to the donor — how much DHT-resistant hair they have on the back and sides, relative to the area that needs covering. A strong donor and a contained area is an easy yes. Advanced loss with a strong donor can often still get a great, if prioritised, result. The honest cautions: someone whose donor itself is thinning (a less common pattern), someone whose expectations can't be met by their donor supply, and a young person losing fast who hasn't yet stabilised with medication — these need careful, honest conversations, and sometimes the right answer is \"let's protect what you've got first.\" A good clinic will tell people that. We tell people that.",
      "So the line you use is never a promise and never a dismissal. It's: \"Whether it's right for you really comes down to your donor and your goals, and the only way to know that properly is an assessment — a lot of people who assume they're too far gone turn out to be great candidates, and occasionally someone who expects a quick fix needs to hear the honest version. That's exactly what the consultation is for.\"",
    ],
  },
  {
    heading: "13. What Happens at the Consultation",
    body: [
      "Position the consult, every time, as a clinical assessment that gives them the full picture — not a sales appointment.",
      "At a proper consultation the clinician examines the scalp and, importantly, the donor density (sometimes under magnification); stages the pattern of loss; works out a realistic graft plan and what's achievable; designs the hairline with the patient; and lays out the technique, the options including medication, the timeline, and the cost. The patient walks out knowing exactly where they stand. No guesswork, no pressure.",
      "How to say it: \"The consult is really about giving you the full picture so you can decide. They properly assess your donor, map what's realistic for you, design the hairline with you, and walk you through the options and cost. You'll know exactly where you stand — there's no obligation to go ahead.\"",
    ],
  },
  {
    heading: "14. Recovery — Removing the Fear",
    body: [
      "Fear of recovery and fear of \"looking like I've had something done\" stop a lot of people. Make it concrete and it stops being scary.",
      "The procedure itself is done under local anaesthetic — they're awake, comfortable, usually watching something or chatting; it takes several hours depending on graft numbers; and they go home the same day. The first week to ten days is the healing window: a little redness and tiny scabs that fall away on their own by about day ten, with most people back to normal life within a few days to a week.",
      "Then the part you must explain in advance, or it terrifies people: at around two to eight weeks, most of the transplanted hairs fall out. This is called shock loss, and it is completely normal and expected — the follicle stays alive under the skin and is just resetting before it grows. If you don't warn them, they panic and think it failed. New growth starts coming through at around three to four months, real density builds from six to nine months, and the final result lands around nine to twelve months, sometimes a bit longer for bigger cases. So it's a journey, not an overnight switch — but what grows in is permanent.",
      "How to say it: \"Recovery's easier than most people think — a few days of mild redness and tiny scabs that clear within a week or so. One thing I always tell people up front: around the one-month mark the new hairs actually shed. That sounds alarming but it's completely normal and expected — the roots stay put and reset, then you see new growth from around three to four months and your full result by about a year.\"",
    ],
  },
  {
    heading: "15. Funding",
    body: [
      "Money is the elephant in the room — bring it up naturally rather than letting it sit there.",
      "It's not covered by Medicare or, in nearly all cases, private health, because it's classed as cosmetic. But there are accessible pathways. Most clinics offer payment plans through third-party finance providers — often interest-free options — that can bring it down to a manageable weekly figure. And in Australia, many patients access their superannuation early under the ATO's compassionate-release grounds, on the basis that hair loss is significantly affecting their wellbeing. That's facilitated by specialist third parties (for example Release My Super or SuperCare), usually with a one-off setup fee around nine hundred and eighty dollars, and eligibility is ultimately determined by the ATO — so it's framed as \"many people are able to,\" never \"you definitely can.\"",
      "How to say it: \"It's not something Medicare covers, but most people don't pay it all upfront — there are payment plans, and a lot of people actually use early access to their super under compassionate grounds because of how much it affects their confidence and wellbeing. The clinic can point you to people who handle all that paperwork.\"",
    ],
  },
  {
    heading: "16. How You Use All of This",
    body: [
      "Everything above is the knowledge. This is how you carry it.",
      "Explain, don't sell. These are people making a personal, vulnerable decision, not leads to convert. Explain clearly, let them feel in control, and trust follows. Trust books.",
      "Use plain language, and translate every term. Follicle — a hair root. Donor dominance — the back-and-sides hair keeps its \"never falls out\" genetics wherever you move it. Norwood — the scale clinicians use to describe how far loss has progressed. Graft — a tiny natural cluster of one to four hairs.",
      "Validate before you educate. When someone shares a worry, acknowledge it before you inform. \"Yeah, a lot of guys worry about it looking obvious — totally fair. Here's what actually makes the difference…\"",
      "Be honest about expectations. It's your superpower, not your weakness. The donor is finite, loss can continue, and the result depends on managing both. Honesty here is exactly what makes patients happy a year later.",
      "Be a few steps ahead, not a mile. Know enough to explain donor dominance, recovery, and candidacy with confidence — and know where your knowledge ends and the surgeon's begins. \"Great question — I can give you the general picture, but the exact answer comes from the surgeon assessing your specific donor. That's what the consult's for.\"",
    ],
  },
  {
    heading: "17. Where We Land",
    body: [
      "You now understand hair loss better than almost everyone who'll call you. You know the science — DHT, miniaturisation, donor dominance, the finite donor. You know the three types of people who reach out and what they're really living with. You know the solution, the options, the recovery, the funding, and the honest truths that protect everyone.",
      "But here's what separates a good advisor from a great one: great advisors actually believe it — not because they were told to, but because they understand what this does for someone. You've heard the relief in someone's voice when they realise they're not too far gone, or that it's their own hair for life, or that the whole thing is more manageable than they feared.",
      "Every person who calls you is taking a quietly big step about something they've carried for a long time. They're hopeful, a bit embarrassed, and a bit sceptical — and they're looking for someone who knows what they're talking about and genuinely wants to help. That's you now. Welcome every call, every question, every objection. Each one is a chance to help someone stop hiding and start feeling like themselves again.",
    ],
  },
];

function ReadAlong() {
  const [index, setIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        setComplete(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index]);

  const total = sections.length;
  const current = sections[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const progressPct = Math.round(((index + 1) / total) * 100);

  const handleNext = () => {
    if (isLast) {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, "1");
        }
      } catch {
        // ignore
      }
      setComplete(true);
      return;
    }
    setIndex((i) => Math.min(total - 1, i + 1));
  };

  const handleBack = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div
      style={{
        padding: "24px 28px 56px",
        maxWidth: 760,
        margin: "0 auto",
        fontFamily: FONT,
        color: "#111",
        background: "#f7f7f5",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <h1 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
        Read Along — Hair Restoration Product Knowledge
      </h1>
      <p style={{ color: "#6b6b6b", fontSize: 13, margin: "0 0 14px" }}>
        Module 3 — The full written deep-dive. Read this alongside the videos.
      </p>

      {isFirst && (
        <p style={{ color: "#6b6b6b", fontSize: 14, margin: "0 0 18px", lineHeight: 1.7, fontStyle: "italic" }}>
          Built on the same spine as the dental module: mission → understand the patient deeper than they do → the one piece of science → the solution → the options landscape → pre-dissolve every barrier → how you communicate it. The goal isn't to make you recite facts. It's to make you believe — because belief comes through in your voice.
        </p>
      )}

      <div style={{ margin: "0 0 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b6b6b", marginBottom: 6 }}>
          <span>Section {index + 1} of {total}</span>
          <span>{progressPct}%</span>
        </div>
        <div style={{ height: 6, background: "#ebebeb", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: ACCENT, transition: "width 240ms ease" }} />
        </div>
      </div>

      <section
        style={{
          background: "#fff",
          border: "1px solid #ebebeb",
          borderRadius: 12,
          padding: "24px 26px",
        }}
      >
        <h2
          ref={headingRef}
          style={{ fontSize: 20, fontWeight: 600, margin: "0 0 14px", color: "#111", letterSpacing: "-0.005em", scrollMarginTop: 16 }}
        >
          {current.heading}
        </h2>
        {current.body.map((p, i) => {
          if (p.startsWith("How to say it:")) {
            return (
              <p
                key={i}
                style={{
                  fontSize: 17,
                  lineHeight: 1.85,
                  color: "#242424",
                  margin: "0 0 16px",
                  background: "#fff6f4",
                  borderLeft: `3px solid ${ACCENT}`,
                  padding: "12px 14px",
                  borderRadius: 6,
                  fontStyle: "italic",
                }}
              >
                {p}
              </p>
            );
          }
          return (
            <p key={i} style={{ fontSize: 17, lineHeight: 1.85, color: "#242424", margin: "0 0 16px" }}>
              {p}
            </p>
          );
        })}
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <button
          onClick={handleBack}
          disabled={isFirst}
          style={{
            fontFamily: FONT,
            fontSize: 14,
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #ebebeb",
            background: "#fff",
            color: isFirst ? "#bbb" : "#111",
            cursor: isFirst ? "not-allowed" : "pointer",
          }}
        >
          ‹ Back
        </button>
        <button
          onClick={handleNext}
          style={{
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {isLast ? "Finish module" : "Next ›"}
        </button>
      </div>

      {complete && (
        <div
          style={{
            marginTop: 24,
            background: "#111",
            color: "#fff",
            padding: "16px 20px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Module complete
        </div>
      )}
    </div>
  );
}

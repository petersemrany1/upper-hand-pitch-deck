// Ported from the Legal app (family-law-floater/src/lib/handover-check-fixture.ts). Re-run the port script to refresh.
import type { IntelSource } from "./client-intel-evidence";

/** Entirely fictional. No contact details, recordings, appointments or customer IDs. */
export function handoverCheckSources(long = false): IntelSource[] {
  const turns: Array<[string, string]> = [
    ["Channel1", "Hello, this is Morgan from the intake team. Am I speaking with Taylor Sample?"],
    ["Channel2", "Yes, I am Taylor Sample, the person asking for help with my separation."],
    ["Channel1", "Tell me about your relationship and the separation."],
    [
      "Channel2",
      "Jordan and I married in 2014 and separated in May 2025. Our daughter Casey is nine. I rent nearby now.",
    ],
    ["Channel1", "Which properties do you own and what is owing?"],
    [
      "Channel2",
      "Our jointly owned Cedar Street home is worth about $820,000. Its mortgage is $230,000. Jordan lives there and we both pay that loan.",
    ],
    [
      "Channel2",
      "We also jointly own a unit on Willow Road worth $540,000 with a $160,000 mortgage. My father lives in that unit.",
    ],
    ["Channel1", "Anything else in the asset pool?"],
    [
      "Channel2",
      "My super is around $190,000. I don't know Jordan's super. My car is worth $9,000 and I own it outright.",
    ],
    [
      "Channel2",
      "I owe $32,000 on a personal loan from previous legal fees. I have no other loans apart from those mortgages.",
    ],
    [
      "Channel2",
      "From 2019 to 2025 I paid $1,600 each fortnight towards household expenses. I now pay half the mortgages and half the rates.",
    ],
    ["Channel1", "What do you do for work?"],
    ["Channel2", "I work full time as an electrician. I earn $96,000 a year before tax."],
    ["Channel1", "Do either of you have lawyers?"],
    [
      "Channel2",
      "Jordan has not told me of a lawyer. I stopped using my previous lawyer because the bill exceeded the quote. No property agreement is signed.",
    ],
    [
      "Channel1",
      "For illustration only, suppose someone asked for 70 percent. That is not advice or your stated goal.",
    ],
    [
      "Channel2",
      "I am not asking for a particular percentage. I want to sell Cedar Street and buy out Jordan's share in Willow Road so Dad can stay there. If I cannot afford the buyout, I would agree to sell both.",
    ],
    [
      "Channel2",
      "I want equal parenting time with Casey and a written arrangement. We currently share her care equally.",
    ],
    ["Channel1", "How do you want to fund legal costs?"],
    [
      "Channel2",
      "I want to explore litigation funding repaid from the settlement. I only have $2,000 in accessible savings. I have not been approved and have not agreed to another funding method.",
    ],
    ["Channel1", "Our booking deposit is $75 and this call is part of the conversion funnel."],
    [
      "Channel2",
      "My rental lease ends in February 2027, so I want to make progress before then. I worry about another legal bill going over the quote.",
    ],
    [
      "Channel2",
      "Can the lawyer explain how funding would be repaid if I keep the unit rather than receive cash?",
    ],
  ];
  const transcript = (items: Array<[string, string]>) =>
    items
      .map(
        ([voice, words], i) =>
          `[${(i * 2).toFixed(2)}–${(i * 2 + 1.8).toFixed(2)}] Speaker ${voice}: ${words}`,
      )
      .join("\n");
  if (!long) return [{ id: "test-call-1", kind: "transcript", text: transcript(turns) }];
  // Exercise large line references, interleaved voices and facts spread across calls.
  const extended: Array<[string, string]> = [];
  for (const turn of turns) {
    for (let n = 0; n < 47; n++)
      extended.push([
        n % 2 ? "Channel2" : "Channel1",
        n % 2 ? "Okay." : "Just a moment while I check the connection.",
      ]);
    extended.push(turn);
  }
  return [
    { id: "test-call-1", kind: "transcript", text: transcript(extended) },
    ...Array.from({ length: 8 }, (_, i): IntelSource => ({
      id: `test-call-${i + 2}`,
      kind: "transcript",
      text: transcript([
        ["Channel1", "Hello, this is the intake team following up with Taylor Sample."],
        [
          "Channel2",
          "Yes, Taylor speaking. No changes to the property figures or my funding preference since the detailed call.",
        ],
      ]),
    })),
    {
      id: "test-call-10",
      kind: "transcript",
      text: transcript([
        ["Channel2", "Hello, this is the intake team. Any changes, Taylor?"],
        [
          "Channel1",
          "Taylor here. My new car valuation is $10,500, replacing my earlier $9,000 estimate. Everything else is unchanged.",
        ],
      ]),
    },
  ];
}

export function handoverCheckAssertions(notes: string, long = false) {
  const lower = notes.toLowerCase();
  const numbers = notes.replace(/,/g, "");
  const timing = notes
    .split("\n")
    .filter((line) => /^- Why now:/i.test(line))
    .join(" ");
  const assertedTiming = timing.replace(
    /\b(?:this|it) is not (?:a )?(?:stated )?deadline to (?:resolve|finalise|settle)(?: or (?:resolve|finalise|settle))*\b/gi,
    "",
  );
  return [
    {
      label: "Background and parenting",
      passed: /2014/.test(notes) && /2025/.test(notes) && /casey/i.test(notes),
    },
    {
      label: "Both properties and mortgages",
      passed: ["820000", "230000", "540000", "160000"].every((n) => numbers.includes(n)),
    },
    {
      label: "Superannuation, debt and contributions",
      passed: ["190000", "32000", "1600"].every((n) => numbers.includes(n)),
    },
    {
      label: "Employment and income",
      passed: lower.includes("electrician") && numbers.includes("96000"),
    },
    {
      label: "Funding preference and cash constraint",
      passed: lower.includes("funding") && numbers.includes("2000"),
    },
    {
      label: "Client goal and sale fallback",
      passed:
        /buy.?out|buy.*share/i.test(notes) &&
        /sell(?:ing)? both|sale of both|both properties (?:would |could |can )?be sold/i.test(
          notes,
        ),
    },
    {
      label: "Deadline and actual client question",
      passed:
        notes.includes("2027") && /Question for the lawyer|Questions for the lawyer/i.test(notes),
    },
    {
      label: "No invented completion deadline",
      passed:
        Boolean(timing) &&
        !/deadline.{0,70}(?:resolv|finalis|settl)|(?:resolv|finalis|settl)\w*.{0,100}\b(?:before|by)\b/i.test(
          assertedTiming,
        ),
    },
    {
      label: "No hypothetical percentage or sales administration",
      passed: !/70\s*(%|percent|per cent)|\$75\b|conversion funnel|Morgan/i.test(notes),
    },
    ...(long
      ? [
          {
            label: "Later correction with reversed speaker roles",
            passed: numbers.includes("10500"),
          },
        ]
      : []),
  ];
}

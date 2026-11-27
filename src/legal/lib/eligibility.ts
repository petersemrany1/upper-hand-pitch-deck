// Ported from the Legal app (family-law-floater/src/lib/eligibility.ts). Re-run the port script to refresh.
/**
 * Litigation Funding Eligibility — pure decision logic + config.
 *
 * INTERNAL ONLY. Nothing in this module may be denormalised onto
 * firm_appointments, included in the handover email, or shown to any firm
 * portal user. The rep never does maths — every total is computed here.
 */

/** Bold’s internal threshold for a strong preliminary result, inclusive. */
export const POOL_MINIMUM = 400_000;

// JustFund lawyer checklist, standard FAQs and EquityAssist product conditions.
// https://justfund.com.au/wp-content/uploads/2025/04/Eligibility-Checklist-1.pdf
// https://justfund.com.au/faqs/ and https://justfund.com.au/equityassist/
const STANDARD_POOL_FLOOR = 300_000; // The lender's checklist says strictly above.
const STANDARD_FACILITY_MINIMUM = 5_000;
const EQUITY_ASSIST_CAP = 25_000;
// Standard product pricing, https://justfund.com.au/family-law-funding/.
// Lower bound if the requested fees are drawn in full. Interest and security costs are additional.
const MIN_ASSESSMENT_FEE = 560;
const PROCESSING_BASIS_POINTS = 375;

export const FUNDING_ISSUES = {
  none: "Nothing else that I know of",
  debt: "There are other debts or claims against the money",
  restricted: "The money is frozen, promised to someone else or already spent",
  payout: "I won’t get cash at settlement, or I’ll only be paid later",
  dispute: "There’s a dispute about the case, who owns the assets or what they’re worth",
  representation: "I can’t have a lawyer act for me",
  authority: "Someone else needs to apply or give permission",
  other: "Something else could hold it up",
  unsure: "I’m not sure",
} as const;

const issueReasons: Record<Exclude<keyof typeof FUNDING_ISSUES, "none">, string> = {
  debt: "You mentioned another debt or claim. We need to establish how much would be left after that’s paid.",
  restricted:
    "You mentioned money that’s tied up or already used. We need to check what would actually be available at settlement.",
  payout:
    "You said you wouldn’t have cash available when the case settles. JustFund would need to check how the loan could be repaid then.",
  dispute:
    "You mentioned a dispute affecting the case or the assets. Its outcome could change what is available to repay a loan.",
  authority:
    "We need to check who can give instructions and authorise the borrowing before relying on funding.",
  representation:
    "JustFund needs a family lawyer acting for you before it can set up this funding.",
  other:
    "You mentioned something that could hold up the settlement. We’d need to understand what it means for the funding.",
  unsure: "We still need to check whether anything else has a claim on the settlement money.",
};

function minimumRepaymentIfDrawn(principal: number): number {
  return principal + MIN_ASSESSMENT_FEE + Math.ceil((principal * PROCESSING_BASIS_POINTS) / 10_000);
}

export type EligibilityVerdict =
  "incomplete" | "unconfirmed" | "eligible" | "equity_assist" | "denied";

export type TitleOption = "yours" | "theirs" | "joint" | "trust_company" | "unsure";

export type EligibilityFlags = {
  applicant_profile?: "adult_au" | "adult_overseas" | "under_18" | "unsure";
  funding_issue?: keyof typeof FUNDING_ISSUES | "details";
  signed_scope?: "remaining" | "unsure";
  equity_unknown?: boolean;
  business_valued?: "yes" | "no" | "unsure";
  q1_resident?: "yes" | "no" | "unsure";
  q2_bankrupt?: "no" | "discharged" | "yes" | "unsure";
  q3_separated?: "yes" | "no" | "unsure";
  signed_papers?: "yes" | "no" | "unsure";
  signed_document?: "transfer" | "orders" | "agreement" | "other" | "unsure";
  property_status?:
    | "open"
    | "agreed"
    | "agreed_unsure"
    | "awaiting_payout" // Legacy answer did not identify the payee.
    | "payout_to_caller"
    | "payout_to_ex"
    | "non_cash_payment"
    | "unpaid"
    | "reopen"
    | "settled"
    | "none"
    | "unsure";
  q4_property_in_au?: "yes" | "no" | "no_property" | "unsure";
  /** Multi-select — a client may hold several properties in different names. */
  q5_title?: TitleOption[];
  q6_other_owner?: "no" | "yes" | "unsure";
  house_plan?: "keep" | "sell" | "ex_keeps" | "transferred" | "undecided" | "no_house";
  /** Recorded only when an agreement or order specifies cash payable to this caller. */
  agreed_cash_amount?: number;
  /** Older screens collected repayment projections. Keep them readable on saved records. */
  repayment_source?: "sale" | "payout" | "refinance" | "none" | "unsure";
  refinance_approved?: "yes" | "no" | "unsure";
  /** Earlier screen recorded gross proceeds. Never treat that as a repayment budget. */
  expected_cash?: number | null;
  fee_estimate_confirmed?: boolean;
  funding_needed?: number | null;
  repayment_budget?: number | null;
  payout_basis?: "written" | "professional" | "personal" | "unsure";
  sale_money_identified?: "yes" | "no" | "unsure";
  other_asset_value?: "zero" | "unknown";
  pool_checked?: "yes" | "no" | "unsure";
  timing_cleared?: "yes" | "no" | "unsure";
  repayment_when?: "at_settlement" | "later" | "unsure";
  /** Single figure: total net equity (Australian property only). May be negative. */
  q7?: { net_equity: number };
  q8?: { answer: "no" | "yes" | "unsure"; business_value: number; money_with_lawyer: number };
  q9_out_of_time?: "no" | "yes" | "unsure" | "existing_order";
  cash_access?: "yes" | "no" | "depends" | "unsure";
  cash_range_access?: "all" | "some" | "none" | "unsure";
  cash_for_fees?: number | null;
};

export type FlagCode =
  | "not_on_title"
  | "structures"
  | "third_party_owner"
  | "overseas_property"
  | "out_of_time_on_title"
  | "discharged_bankrupt";

export type EligibilityFlag = { code: FlagCode; label: string };

export type EligibilityResult = {
  verdict: EligibilityVerdict;
  netPool: number;
  /** Reason shown for a denial (first matching rule wins). */
  reason: string | null;
  /** Denial rule code, when denied. */
  code: string | null;
  flags: EligibilityFlag[];
  /** Question numbers still missing an answer. */
  missing: number[];
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Tolerates legacy rows saved with the old three-field Q7 shape
 * ({ worth, owing, other_debts }) by folding them into one figure.
 */
export function recordedEquity(a: EligibilityFlags): number | undefined {
  if (a.equity_unknown) return undefined;
  const q7 = a.q7 as
    { net_equity?: number; worth?: number; owing?: number; other_debts?: number } | undefined;
  if (!q7) return undefined;
  if (q7.net_equity !== undefined)
    return Number.isSafeInteger(q7.net_equity) ? q7.net_equity : undefined;
  if (
    q7.worth == null ||
    q7.owing == null ||
    ![q7.worth, q7.owing, q7.other_debts ?? 0].every(Number.isSafeInteger)
  )
    return undefined;
  return q7.worth - q7.owing - (q7.other_debts ?? 0);
}

export function netEquityOf(a: EligibilityFlags): number {
  return recordedEquity(a) ?? 0;
}

/** Legacy rows may hold a single string for Q5. */
export function titlesOf(a: EligibilityFlags): TitleOption[] {
  const raw = a.q5_title as unknown;
  if (Array.isArray(raw)) return raw as TitleOption[];
  if (typeof raw === "string" && raw) return [raw as TitleOption];
  return [];
}

/** Display order is independent of the original numbered keys in saved answers. */
export function isApplicable(a: EligibilityFlags, n: number): boolean {
  if (n === 2) return a.q3_separated !== "no";
  if (n === 4) return !a.q4_property_in_au || a.q4_property_in_au === "yes";
  return true;
}

/**
 * "On title" = Yours or Joint is ticked for an Australian property. Whatever
 * else is ticked alongside doesn't matter.
 */
export function isOnTitle(a: EligibilityFlags): boolean {
  if (a.q4_property_in_au !== "yes") return false;
  const t = titlesOf(a);
  return t.includes("yours") || t.includes("joint");
}

/**
 * Whether we know enough to say the client is NOT on title — either Q5 has
 * been answered, or Q4 says there is no Australian property to be on title of.
 * Guards the residency knockout so a blank Q5 never reads as "not on title".
 */
export function titleKnown(a: EligibilityFlags): boolean {
  if (a.q4_property_in_au === "no" || a.q4_property_in_au === "no_property") return true;
  return a.q4_property_in_au === "yes" && titlesOf(a).length > 0 && !titlesOf(a).includes("unsure");
}

/**
 * What counts: Australian real-estate equity, a valued business, money in a
 * lawyer's trust account. Property equity only enters the pool when the
 * property is in Australia.
 */
export function netPoolOf(a: EligibilityFlags): number {
  const business =
    a.q8?.answer === "yes" && a.business_valued === "yes" ? num(a.q8.business_value) : 0;
  const lawyer = a.q8?.answer === "yes" ? num(a.q8.money_with_lawyer) : 0;
  const equity =
    a.q4_property_in_au === "yes" && a.house_plan !== "transferred" && a.house_plan !== "no_house"
      ? netEquityOf(a)
      : 0;
  return equity + business + lawyer;
}

export function hasRealEstate(a: EligibilityFlags): boolean {
  return a.q4_property_in_au === "yes" || a.q4_property_in_au === "no";
}

/** Confirm the amounts entered in question 5 only when that question adds assets. */
export function needsOtherAssetCheck(a: EligibilityFlags): boolean {
  return a.q8?.answer === "yes" && (a.q8.business_value > 0 || a.q8.money_with_lawyer > 0);
}

export function needsSettlementUpdate(a: EligibilityFlags): boolean {
  return (
    a.property_status === "awaiting_payout" ||
    (a.property_status === "open" && a.repayment_source === "none")
  );
}

export function canConfirmExistingOrder(a: EligibilityFlags): boolean {
  return (
    a.signed_papers === "yes" &&
    a.signed_document === "orders" &&
    a.property_status === "payout_to_caller"
  );
}

/** Return missing questions in the order the rep asks them on the call. */
export function missingQuestions(a: EligibilityFlags): number[] {
  const missing: number[] = [];
  if (
    !a.q3_separated ||
    (a.q3_separated === "yes" &&
      (!a.signed_papers ||
        !a.property_status ||
        needsSettlementUpdate(a) ||
        a.property_status === "agreed" ||
        (a.signed_papers === "yes" &&
          (!a.signed_document || (a.property_status === "open" && !a.signed_scope)))))
  )
    missing.push(1);
  if (
    isApplicable(a, 2) &&
    (!a.q9_out_of_time ||
      (a.q9_out_of_time === "existing_order" && !canConfirmExistingOrder(a)) ||
      (a.q9_out_of_time === "yes" && !a.timing_cleared))
  )
    missing.push(2);
  if (!a.q4_property_in_au || (hasRealEstate(a) && !a.house_plan)) missing.push(3);
  const hasEquity = recordedEquity(a) !== undefined;
  if (
    isApplicable(a, 4) &&
    (!titlesOf(a).length || !a.q6_other_owner || (!hasEquity && !a.equity_unknown))
  )
    missing.push(4);
  if (
    !a.q8?.answer ||
    (a.q8.answer === "yes" &&
      !a.q8.business_value &&
      !a.q8.money_with_lawyer &&
      !a.other_asset_value) ||
    (needsOtherAssetCheck(a) && !a.pool_checked) ||
    (a.q8?.answer === "yes" && a.q8.business_value > 0 && !a.business_valued)
  )
    missing.push(5);
  if (!a.q1_resident || !a.applicant_profile) missing.push(6);
  if (
    !a.q2_bankrupt ||
    (a.q2_bankrupt !== "yes" && (!a.funding_issue || a.funding_issue === "details"))
  )
    missing.push(7);
  return missing;
}

/** Note but never decline on. */
function flagsFor(a: EligibilityFlags): EligibilityFlag[] {
  const flags: EligibilityFlag[] = [];
  const t = titlesOf(a);
  const auProperty = a.q4_property_in_au === "yes";
  if (auProperty && t.length > 0 && !isOnTitle(a))
    flags.push({ code: "not_on_title", label: "Not on title — standard line of credit only" });
  if (auProperty && t.includes("trust_company"))
    flags.push({ code: "structures", label: "Property held in a trust or company" });
  if (auProperty && a.q6_other_owner === "yes")
    flags.push({ code: "third_party_owner", label: "Someone else owns part of the property" });
  if (a.q4_property_in_au === "no")
    flags.push({
      code: "overseas_property",
      label: "Property is overseas — excluded from the pool",
    });
  if (isApplicable(a, 2) && a.q9_out_of_time === "yes" && isOnTitle(a))
    flags.push({
      code: "out_of_time_on_title",
      label: "The usual filing period may have passed",
    });
  if (a.q2_bankrupt === "discharged")
    flags.push({ code: "discharged_bankrupt", label: "Previous bankruptcy disclosed" });
  return flags;
}

/** Preliminary referral fit. The asset pool belongs to both parties. JustFund assesses
 * the individual entitlement, any repayment arrangements and the amount it can lend. */
export function computeEligibility(a: EligibilityFlags): EligibilityResult {
  const missing = missingQuestions(a);
  const flags = flagsFor(a);
  const netPool = netPoolOf(a);
  const onTitle = isOnTitle(a);

  const deny = (code: string, reason: string): EligibilityResult => ({
    verdict: "denied",
    netPool,
    reason,
    code,
    flags,
    missing,
  });

  const need = a.fee_estimate_confirmed === true ? a.funding_needed : null;
  if (need === 0)
    return deny(
      "no_loan_needed",
      "You said you don’t need to borrow for legal fees at this stage.",
    );

  // Standalone knockouts — run before the incomplete gate.
  if (a.q3_separated === "no")
    return deny("not_separated", "This funding is for people who have already separated.");
  if (a.q2_bankrupt === "yes")
    return deny(
      "bankrupt",
      "You said you’re currently bankrupt, so this type of loan looks unlikely.",
    );
  if (a.applicant_profile === "under_18")
    return deny(
      "under_18",
      "JustFund’s family law line of credit is designed for borrowers aged 18 or over.",
    );
  if (
    a.q1_resident === "no" &&
    a.applicant_profile === "adult_overseas" &&
    titleKnown(a) &&
    !onTitle
  )
    return deny(
      "not_resident",
      "You said you live overseas, aren’t an Australian citizen or permanent resident and don’t hold title to Australian property. That puts you outside the usual lending criteria.",
    );

  if (a.q3_separated === "yes" && (a.property_status === "settled" || a.property_status === "none"))
    return deny(
      "no_open_property",
      "From what you’ve told me, there’s no property or money left to divide, so this loan looks unlikely.",
    );

  const unconfirmed = (reason: string): EligibilityResult => ({
    verdict: "unconfirmed",
    netPool,
    reason: "At this stage, I’m not sure JustFund could cover your legal fees. " + reason,
    code: null,
    flags,
    missing,
  });
  if (a.q3_separated === "unsure")
    return unconfirmed(
      "We need to establish whether the separation has happened before screening this property matter.",
    );
  if (a.q2_bankrupt === "unsure")
    return unconfirmed(
      "We need to check your current bankruptcy status before relying on funding.",
    );
  if (a.q3_separated === "yes") {
    if (needsSettlementUpdate(a))
      return unconfirmed(
        "Let’s check what still needs to be divided and who is due to receive any agreed payment.",
      );
    if (a.property_status === "payout_to_ex")
      return unconfirmed(
        "You said the agreed payment is going to your ex. JustFund would need to check whether your share could support funding.",
      );
    if (a.property_status === "reopen")
      return unconfirmed(
        a.signed_papers === "yes" && a.signed_document === "transfer"
          ? "You mentioned signing the property over. If the lawyer looks at the settlement again, we don’t know yet whether there’ll be another payout to pay back the loan."
          : "You want the lawyer to look again at how the property was split. We don’t know yet whether that would leave you with any more money to pay back a loan.",
      );
    if (a.property_status === "non_cash_payment")
      return unconfirmed(
        "You said you’ll receive property or payments over time. JustFund would need to check whether enough money would be available when the loan falls due.",
      );
    if (a.property_status === "unpaid")
      return unconfirmed(
        "You’re still waiting on a payment that’s overdue, so we don’t know when you’d have the money to pay back a loan.",
      );
    if (
      a.signed_papers === "unsure" ||
      (a.signed_papers === "yes" && a.signed_document === "unsure")
    )
      return unconfirmed(
        "We’d need to check the paperwork to see whether it already decides who gets the property.",
      );
    if (a.property_status === "open" && a.signed_papers === "yes" && a.signed_scope === "unsure")
      return unconfirmed(
        "You signed paperwork, and it’s unclear which assets are still yours and your ex’s to divide. We’d need to check what the paperwork covers.",
      );
    if (a.property_status === "unsure" || a.property_status === "agreed_unsure")
      return unconfirmed(
        "We still need to know what was agreed and whether there’s money left to divide.",
      );
  }
  if (a.q2_bankrupt === "discharged")
    return unconfirmed(
      "Your bankruptcy has ended. JustFund may still be able to help, but needs to check whether a trustee has any claim on the assets.",
    );
  if (
    a.q1_resident === "no" ||
    a.q1_resident === "unsure" ||
    a.applicant_profile === "adult_overseas" ||
    a.applicant_profile === "unsure"
  )
    return unconfirmed(
      onTitle
        ? "Your name is on Australian property. JustFund would need to confirm your age and residency meet its lending criteria."
        : "JustFund would need to confirm your age and residency meet its lending criteria.",
    );
  if (a.funding_issue && a.funding_issue !== "none" && a.funding_issue !== "details")
    return unconfirmed(issueReasons[a.funding_issue]);
  if (a.q4_property_in_au === "unsure")
    return unconfirmed(
      "We need to establish whether either of you owns Australian property before counting it.",
    );
  if (
    a.q4_property_in_au === "yes" &&
    (titlesOf(a).includes("unsure") || a.q6_other_owner === "unsure")
  )
    return unconfirmed(
      "We need to check whose names are on the title and whether anyone else owns a share.",
    );
  if (a.q8?.answer === "unsure")
    return unconfirmed(
      "We need to establish which business or settlement funds are available and what debts go with them.",
    );
  if (a.q4_property_in_au === "yes" && a.equity_unknown)
    return unconfirmed(
      "You’re unsure how much is left in the property. A recent mortgage balance and an estimate of its value would help us check.",
    );
  if (
    a.q8?.answer === "yes" &&
    !a.q8.business_value &&
    !a.q8.money_with_lawyer &&
    a.other_asset_value === "unknown"
  )
    return unconfirmed(
      "You mentioned a business or money held by a lawyer. We need an estimate of its value after debts before relying on it.",
    );
  if (needsOtherAssetCheck(a) && a.pool_checked && a.pool_checked !== "yes")
    return unconfirmed(
      "We still need to check how much of the business or money held by the lawyer belongs to you and your ex after debts.",
    );
  if (isApplicable(a, 2) && a.q9_out_of_time === "unsure")
    return unconfirmed("We still need to check the dates of your divorce or separation.");
  if (
    isApplicable(a, 2) &&
    a.q9_out_of_time === "yes" &&
    a.timing_cleared &&
    a.timing_cleared !== "yes"
  )
    return unconfirmed(
      "The dates you gave may affect the property claim. We need to know whether it was filed in time or the court has allowed it to go ahead.",
    );
  if (
    a.q8?.answer === "yes" &&
    a.q8.business_value > 0 &&
    a.business_valued &&
    a.business_valued !== "yes" &&
    netPool < POOL_MINIMUM
  )
    return unconfirmed(
      "The funding check would need to rely on the business. JustFund asks for an independent valuation before counting it.",
    );
  if (missing.length)
    return { verdict: "incomplete", netPool, reason: null, code: null, flags, missing };

  const agreedCash = a.property_status === "payout_to_caller" ? a.agreed_cash_amount : undefined;
  if (
    [agreedCash, need].some((value) => value != null && (!Number.isSafeInteger(value) || value < 0))
  )
    return unconfirmed("Let’s double-check the figure in the paperwork.");
  if (a.q4_property_in_au === "no" && netPool < POOL_MINIMUM)
    return unconfirmed(
      "The property you mentioned is overseas. JustFund needs to check the Australian assets and whether it can fund this settlement.",
    );
  if (
    a.q4_property_in_au === "yes" &&
    (a.house_plan === "transferred" || a.house_plan === "no_house")
  )
    return unconfirmed(
      "You mentioned Australian property and that the property is already gone. We need to check which assets are still available before counting its value.",
    );
  if (netPool <= 0) {
    if (a.property_status === "payout_to_caller")
      return unconfirmed(
        "You mentioned a payment is still due to you. JustFund would need to see the agreement and check what assets are available.",
      );
    return deny(
      "no_equity",
      "The figures you gave leave no assets after debts to support this loan.",
    );
  }
  if (
    agreedCash != null &&
    (agreedCash <= minimumRepaymentIfDrawn(STANDARD_FACILITY_MINIMUM) || agreedCash > netPool)
  )
    return unconfirmed(
      `You mentioned a written payment of ${formatAud(agreedCash)}. JustFund would need to check that figure against the assets and its funding requirements.`,
    );
  const minimumRepayment = need != null ? minimumRepaymentIfDrawn(need) : null;
  if (
    need != null &&
    minimumRepayment != null &&
    agreedCash != null &&
    minimumRepayment >= agreedCash
  )
    return unconfirmed(
      `The fees you want funded are ${formatAud(need)} and the payment you mentioned is ${formatAud(agreedCash)}. JustFund would need to check whether that could cover the loan and its charges.`,
    );
  if (a.q4_property_in_au === "yes" && a.q6_other_owner === "yes")
    return unconfirmed(
      "Someone else owns part of the property. JustFund would need to check the ownership and what is available for your settlement.",
    );
  if (titlesOf(a).includes("trust_company") && a.q4_property_in_au === "yes")
    return unconfirmed(
      "A trust or company owns some of the property. The lender needs to check how much of that value you can actually use.",
    );
  if (
    (a.q4_property_in_au !== "yes" || netEquityOf(a) <= 0) &&
    a.q8?.answer === "yes" &&
    a.q8.business_value > 0 &&
    !a.q8.money_with_lawyer
  )
    return unconfirmed(
      "The main asset you’ve identified is a business. JustFund would need to check its value and how it would turn into money for your settlement.",
    );
  const standardPool = netPool > STANDARD_POOL_FLOOR;
  const securityPossible =
    onTitle && netEquityOf(a) > 0 && a.house_plan !== "transferred" && a.house_plan !== "no_house";
  if (!standardPool && securityPossible) {
    if (netEquityOf(a) <= MIN_ASSESSMENT_FEE)
      return unconfirmed(
        "There’s very little left after the property debts. JustFund would need to check whether any secured loan could cover its own costs.",
      );
    const ceiling = Math.min(EQUITY_ASSIST_CAP, netEquityOf(a));
    const reason =
      need != null && need > ceiling
        ? `A smaller loan secured against your property may cover part of your fees. Even before the lender checks its security, the amount requested leaves at least ${formatAud(need - ceiling)} to cover another way.`
        : "Because you own a share of property with money left after debts, a smaller secured loan may be an option. JustFund would confirm the amount.";
    return { verdict: "equity_assist", reason, code: "secured_option", netPool, flags, missing };
  }
  if (!standardPool)
    return deny(
      "pool_too_small",
      "The assets left after debts fall outside the usual range for this property loan, and we haven’t identified property you could use for a smaller secured loan.",
    );
  if (minimumRepayment != null && minimumRepayment >= netPool)
    return unconfirmed(
      "The fees you want funded and the lender’s charges could use up all the assets you and your ex have left after debts. JustFund would need to look at the figures.",
    );
  if (need != null && need < STANDARD_FACILITY_MINIMUM)
    return unconfirmed(
      "The amount you want funded is below the usual minimum for this loan. The lawyer can talk you through the costs at your consultation.",
    );
  if (netPool < POOL_MINIMUM)
    return unconfirmed(
      "There are assets to divide. The total is in the range where we ask JustFund to check the figures before calling funding likely.",
    );
  const equity = netEquityOf(a);
  const trustCash =
    a.q8?.answer === "yes" && a.pool_checked === "yes" ? num(a.q8.money_with_lawyer) : 0;
  const salePlanned =
    a.q4_property_in_au === "yes" &&
    a.house_plan === "sell" &&
    equity > 0 &&
    equity + trustCash >= POOL_MINIMUM;
  const cashHeldForSplit = a.property_status === "open" && trustCash >= POOL_MINIMUM;
  const openPropertyFit = a.property_status === "open" && onTitle && equity >= POOL_MINIMUM;
  if (
    !salePlanned &&
    !openPropertyFit &&
    !cashHeldForSplit &&
    a.property_status !== "payout_to_caller"
  )
    return unconfirmed(
      "There are assets to divide. It’s still unclear whether you’ll receive money from the settlement. JustFund can look at that with your lawyer.",
    );
  let evidence =
    "You said the property is likely to be sold and there’s money left after the mortgage.";
  if (cashHeldForSplit)
    evidence = `You said about ${formatAud(trustCash)} is held in trust in Australia for the property split. JustFund can assess what part of that money you may receive.`;
  if (openPropertyFit)
    evidence = `You’re still working out the property split. Your name is on the title, and you said there’s about ${formatAud(equity)} in property equity between you and your ex after debts.`;
  if (a.property_status === "payout_to_caller")
    evidence =
      agreedCash != null
        ? `You said the paperwork provides for a payment of ${formatAud(agreedCash)} to you.`
        : "You said you and your ex have agreed that you’ll receive a payment.";
  return {
    verdict: "eligible",
    netPool,
    flags,
    missing,
    code: "standard_screen",
    reason: `${evidence} That makes it worth applying to JustFund. They’ll check your share with your lawyer and tell you whether they can fund your fees.`,
  };
}

/** Extra line shown on the result card for equity-assist verdicts only. */
export const EQUITY_ASSIST_NOTE =
  "EquityAssist covers eligible legal costs up to $25,000. It requires a mortgage or caveat over property the borrower owns.";

export function formatAud(n: number): string {
  const neg = n < 0;
  const v = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(Math.abs(n));
  return `${neg ? "−" : ""}$${v}`;
}

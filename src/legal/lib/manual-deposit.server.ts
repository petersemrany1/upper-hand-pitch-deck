// Ported from the Legal app (family-law-floater/src/lib/manual-deposit.server.ts). Re-run the port script to refresh.
// Server-only helpers for taking the $75 refundable deposit over the phone as a
// real card charge through Square (Web Payments SDK token + Payments API).
export {
  DEPOSIT_CENTS,
  chargeManualDeposit,
  depositDescription,
  settleManualPayment as settleDepositIntent,
  squareApplicationId,
  squareLocationId,
} from "./square-deposit.server";

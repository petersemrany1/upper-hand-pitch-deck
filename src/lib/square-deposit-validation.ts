import type { SquarePayment } from "./square.server";

export const DEPOSIT_AMOUNT_CENTS = 7500;

/** A successful HTTP response alone does not mean money has been received. */
export function isCompletedSquareDeposit(payment: SquarePayment, leadId: string): boolean {
  return Boolean(payment.id) && payment.status === "COMPLETED" &&
    payment.reference_id === leadId &&
    payment.amount_money?.amount === DEPOSIT_AMOUNT_CENTS &&
    payment.amount_money.currency === "AUD";
}

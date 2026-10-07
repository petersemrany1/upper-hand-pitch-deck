import { describe, expect, mock, test } from "bun:test";
import { createSquarePaymentSubmitter } from "./square-payment-submission";
import type { TokenResult } from "./square";

function setup() {
  const charge = mock(async (_token: string, _verification?: string): Promise<boolean | null> => true);
  const onBusy = mock((_busy: boolean) => {});
  const onError = mock((_message: string | null) => {});
  return { charge, onBusy, onError, ...createSquarePaymentSubmitter({ charge, onBusy, onError }) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("Square card and wallet submission", () => {
  test("opens the wallet synchronously within the click and forwards its token", async () => {
    const checkout = setup();
    let insideClick = false;
    const button = new EventTarget();
    let submission!: Promise<void>;
    const tokenize = mock(() => {
      expect(insideClick).toBe(true);
      return Promise.resolve({ status: "OK", token: "wallet-token", verificationToken: "verified" });
    });
    button.addEventListener("click", () => {
      insideClick = true;
      submission = checkout.submit({ tokenize });
      expect(tokenize).toHaveBeenCalledTimes(1);
      insideClick = false;
    });
    button.dispatchEvent(new Event("click"));
    await submission;
    expect(checkout.charge).toHaveBeenCalledWith("wallet-token", "verified");
    expect(checkout.onBusy.mock.calls).toEqual([[true], [false]]);
  });

  test("blocks other buttons during tokenization and the server charge", async () => {
    const checkout = setup();
    const token = deferred<TokenResult>();
    const payment = deferred<boolean>();
    checkout.charge.mockImplementation(() => payment.promise);
    const other = { tokenize: mock(async () => ({ status: "OK", token: "other" })) };
    const first = checkout.submit({ tokenize: () => token.promise });
    await checkout.submit(other);
    token.resolve({ status: "OK", token: "first" });
    await Promise.resolve();
    await checkout.submit(other);
    expect(other.tokenize).not.toHaveBeenCalled();
    expect(checkout.charge).toHaveBeenCalledTimes(1);
    payment.resolve(true);
    await first;
    await checkout.submit(other);
    expect(other.tokenize).not.toHaveBeenCalled();
  });

  test.each([
    { status: "Cancel" },
    { status: "Error", errors: [{ message: "Wallet unavailable" }] },
    { status: "OK" },
  ])("does not charge $status without a valid token and permits a retry", async (result) => {
    const checkout = setup();
    await checkout.submit({ tokenize: async () => result });
    expect(checkout.charge).not.toHaveBeenCalled();
    if (result.status === "Cancel") expect(checkout.onError.mock.calls).toEqual([[null]]);
    await checkout.submit({ tokenize: async () => ({ status: "OK", token: "retry" }) });
    expect(checkout.charge).toHaveBeenCalledTimes(1);
  });

  test("handles SDK exceptions and releases the button for retry", async () => {
    const checkout = setup();
    await checkout.submit({ tokenize: () => { throw new Error("SDK failed"); } });
    expect(checkout.charge).not.toHaveBeenCalled();
    expect(checkout.onError.mock.calls.at(-1)?.[0]).toContain("Please try again");
    expect(checkout.onBusy.mock.calls.at(-1)).toEqual([false]);
    await checkout.submit({ tokenize: async () => ({ status: "OK", token: "retry" }) });
    expect(checkout.charge).toHaveBeenCalledTimes(1);
  });

  test("allows another attempt after the server declines a payment", async () => {
    const checkout = setup();
    checkout.charge.mockResolvedValueOnce(false);
    const method = { tokenize: async () => ({ status: "OK", token: "token" }) };
    await checkout.submit(method);
    await checkout.submit(method);
    expect(checkout.charge).toHaveBeenCalledTimes(2);
  });

  test("does not charge a late wallet result after leaving the checkout", async () => {
    const checkout = setup();
    const token = deferred<TokenResult>();
    const submission = checkout.submit({ tokenize: () => token.promise });
    checkout.dispose();
    token.resolve({ status: "OK", token: "late-token" });
    await submission;
    expect(checkout.charge).not.toHaveBeenCalled();
  });

  test.each(["lost-response", "pending"])("reuses the payment token when the result is %s", async (state) => {
    const checkout = setup();
    if (state === "pending") checkout.charge.mockResolvedValueOnce(null);
    else checkout.charge.mockRejectedValueOnce(new Error("Response lost after charge"));
    const method = { tokenize: mock(async () => ({ status: "OK", token: "same-attempt" })) };
    await checkout.submit(method);
    await checkout.submit(method);
    expect(method.tokenize).toHaveBeenCalledTimes(1);
    expect(checkout.charge.mock.calls).toEqual([["same-attempt", undefined], ["same-attempt", undefined]]);
  });
});

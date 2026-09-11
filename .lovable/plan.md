# Fixing the issues found in the audit

Five fixes, in order of how much damage they can do. Nothing here changes the pitch deck, and nothing changes how money, packs or lead status work.

## 1. Booking texts that never send (highest impact)

Right now, if someone books **without** paying a deposit, no confirmation text goes out. The sending step exists but nothing calls it.

Fix: after a booking saves successfully, send the confirmation text automatically — same text, same clinic/doctor/time checks already in place. If the text fails, the rep sees a clear "text didn't send — resend" button rather than silence. Deposit bookings keep working exactly as they do now (no double text).

## 2. Clinics disappearing from the picker

The available-slots check has no error handling. If the database hiccups for a second, it returns "no clinics have space" and the rep sees an empty list with no explanation.

Fix: treat a failed check as *unknown*, not *empty* — show the clinics with a small "checking availability" note instead of hiding them, and retry once. Also fetch it once per lead instead of twice (two parts of the screen ask for the same thing today), which makes the booking panel load faster.

## 3. Phone glitches (connection / expired key / too many requests)

Fix: three small hardening changes in the phone layer —
- refresh the phone's temporary key *before* it expires rather than after a call fails
- when Twilio says "slow down", wait and retry automatically instead of erroring
- when picking which company number to call from, if the lookup is slow, fall back to the default number instead of giving up

## 4. Calls with no outcome saved

98 calls in the last day have no outcome recorded, which is why "new" leads linger in the list.

Fix: when a call ends, write the outcome onto the call record as well as the lead — and if the rep somehow skips it, the next call in the session prompts them once. No status is ever changed automatically; the rep still chooses.

## 5. Backend permission gaps (quiet but worth closing)

Six internal analysis functions check that you're logged in but not *who* you are, so a clinic login could in theory run them against another clinic's data. The two public webhook secret checks also compare secrets in a way that's technically leaky.

Fix: add role/ownership checks to those six functions and switch both secret checks to the constant-time helper already in the codebase.

## Deliberately not doing

- **Stripe refund failures (8)** — the Stripe account is blocked; that's an account matter, not code.
- **108 appointments with no doctor** — historical data; I'd leave it unless you want a tidy-up pass.
- **Rob Misale** — one booked lead with no appointment. Say the word and I'll repair it like Damian's.

## Verification

Typecheck plus the 73 automated checks, then a live pass on the sales portal: book without a deposit and confirm the text arrives, and confirm the clinic list still behaves.

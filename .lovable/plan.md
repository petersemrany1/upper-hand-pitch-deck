# Fixing the phone glitches on sales calls

Scope: only the phone. No changes to bookings, texts, packs, lead status or anything else.

## What went wrong and the fix for each

**1. Expired login key ("invalid token")**
The phone gets a short-lived key from Twilio. Today it's only replaced after a call has already failed.
Fix: replace the key on a timer, before it expires, so a rep never hits a dead key mid-session.

**2. "Slow down, too many requests" (rate limit)**
When Twilio briefly throttles us, the call just errors and the rep sees a failure.
Fix: wait a moment and retry automatically, with a short increasing delay, up to a few tries. The rep sees the call connect instead of an error.

**3. Dropped or failed connections**
A few calls failed to connect or dropped out, and the phone stayed in a bad state afterwards.
Fix: when a connection error happens, re-register the phone straight away so the next call starts clean, and show the rep one plain message ("Call didn't connect — try again") rather than a technical code.

**4. Caller-number lookup timed out**
Before dialling, the system looks up which of our numbers to call from. Once, that lookup took too long and the call attempt gave up.
Fix: if the lookup is slow, fall back to the default company number and dial anyway, instead of failing the call.

## What I'll check afterwards

- Typecheck and the existing automated checks still pass.
- Place a real test call through the sales portal and confirm it connects.
- Watch the phone logs for a clean key refresh with no invalid-token error.

## What this does not fix

The booking-text gap, clinic-picker blanking, missing call outcomes and the backend permission gaps from the audit stay untouched until you ask for them.

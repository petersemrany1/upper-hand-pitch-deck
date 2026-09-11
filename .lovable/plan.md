# Ring-backs should jump to the front of the sales call list

## What I found (verified in the code and the live data, not guessed)

The portal already has a "someone rang us back → serve them next" mechanism. It is being
cancelled by two separate rules.

**1. The ring-back cancels itself (main cause).**

There is a shared-team safety rule: if *anyone* dialled a person in the last 10 minutes,
don't serve them again (so two reps can't ring the same person back-to-back).

The "last dialled" figure is built from every row in the call log — and incoming calls are
written to that same log. So the moment the person rings Nina back, the system records a
call against them, decides "they were just called 10 minutes ago", and drops them out of
the priority list. The exact case Nina hits — she rings, no answer, they ring straight
back — is the one case guaranteed to be filtered out.

**2. If the caller isn't already on her loaded list, nothing is queued.**

The ring-back handler only looks for the caller among the leads already loaded on screen.
Anyone outside that list (older enquiry, different group) is silently ignored, even though
the incoming call record already knows exactly which lead it is.

Also confirmed: incoming calls are logged first as "ringing", then updated to
"no-answer"/"completed"; the live update feed is switched on for the call log, so the
portal does hear about the call. Nothing is broken in the plumbing.

## The fix

1. **Only outbound calls count as "we just dialled them".** The 10-minute team guard, and
   the "already tried today" counters, will ignore incoming calls. Someone ringing in is
   not an attempt by us.
2. **Fetch the caller if they're not on the list.** When an incoming call arrives and the
   lead isn't loaded, load that one lead by the id already attached to the call record, then
   put them at the front.
3. **Only skip a ring-back if she actually spoke to them** (a real conversation, or the call
   is live right now). Today a call marked "completed" with no talk time is treated as
   answered and thrown away.
4. **Survive a page refresh.** The front-of-queue list currently lives in memory only, so a
   reload loses the ring-backs. It will be saved per rep for 2 hours.
5. **Make it visible.** The person who rang back is pinned to the top of the list she sees
   with a "called back" badge, so it's obvious before she presses Next — not just a toast
   that disappears.

## Deliberately not changing

- No change to lead statuses, bookings, texts, packs, refunds or clinics.
- The 10-minute double-dial guard stays for outbound calls, so two reps still can't ring the
  same person back-to-back.
- Call history/"Day N" counters keep showing incoming calls in the timeline; only the
  "did *we* dial them" logic changes.
- No change to the order of the normal queue (new leads first, then callbacks, etc.).

## Technical notes

- `src/components/sales-call/queue.ts` — `buildHistory` gains a direction-aware input so
  inbound rows update timeline fields but not `lastAttemptAt` / `todayAttempts`.
- `src/components/SalesCallPortal.tsx` — call-history queries select `direction`;
  missed-call handler resolves unknown leads via `call_records.lead_id`, relaxes the
  answered check to `duration > 0 || status === 'in-progress'`, persists
  `missedCallQueue` in `localStorage` keyed by rep, and the left-hand lead list sorts
  queued ring-backs first with a badge.
- Existing `queue.test.ts` cases extended for inbound rows.

## How you'll test it

From the sandbox: ring the portal number from your mobile while on another lead, don't
answer it, then press Next — you should land on that caller. Refresh mid-way and press Next
again to confirm it survives a reload.

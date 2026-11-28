# Legal move: switch-over day

Everything is built and sits switched off in the Hair (Upper Hand) app. One
switch (`LEGAL_LIVE=true`) plus moving the boldfamilylaw.com.au address hands
the Legal business over. About 60–90 minutes, ideally when the phones are quiet.

How it fits together:
- Legal's doorbells (Twilio, Square, Stripe, Annature, lead forms, firm offers)
  and public pages (firm portal, offers, deposits, set password) live in the Hair
  app at **the same addresses** as in the Legal app. Anything that rings
  boldfamilylaw.com.au keeps working once the address points at the Hair app.
- Until `LEGAL_LIVE=true`, every Legal doorbell answers 503, Legal code can't
  see any `LEGAL_` key, and Legal screens read the old Legal app as before.
- After it: every Legal screen opens inside the Hair app for everyone, on the
  Hair database's `legal_` records.

## Before the day

1. **Peter: Publish the Hair app** in Lovable (top right, Publish). This is safe
   while `LEGAL_LIVE` is off. It also publishes any other Hair changes waiting.
2. Peter: have the logins for Twilio, Square, Stripe (Bold Marketing and Legal
   Group accounts), Annature and Lovable ready.

## On the day, in order

| # | Who | Step |
|---|---|---|
| 1 | Peter | Tell Nina and Bec to stop using the old Legal app for an hour. |
| 2 | Claude | `/legal-move`: **Copy all Legal records**, then **Copy stored files**. Check "counts match". |
| 3 | Peter OKs, Claude runs | `/legal-move`: **Create firm logins (switch-over)** (no emails are sent), then **Copy all Legal records** again so firm records point at the new logins. |
| 4 | Peter | In the Hair project's Secrets, add `LEGAL_LIVE` = `true`, plus the settings below. |
| 5 | Peter | Lovable: Legal Group Portal > Domains: remove boldfamilylaw.com.au (and www). Hair Transplant Group Portal > Domains: add them. Then **Publish** the Hair app. |
| 6 | Claude, Peter OKs | Twilio: two Legal numbers (+61 485 001 237, +61 485 039 058) still ring `family-law-floater.lovable.app`. Change both to `https://boldfamilylaw.com.au/api/public/hooks/twilio-voice-inbound` and `.../twilio-sms-inbound`. The other four already use boldfamilylaw.com.au. |
| 7 | Peter, Claude guides | Webhooks. Checked 28 Nov: Square (Legal Group app) already uses `boldfamilylaw.com.au/api/public/hooks/square-deposit`, so no change. Stripe Bold Marketing's "Legal Group portal – contract payments" uses `family-law-floater.lovable.app/api/public/hooks/bold-stripe`: edit it to `https://boldfamilylaw.com.au/api/public/hooks/bold-stripe` (editing keeps the signing secret). Still to check on the day: the Stripe Legal Group account, Annature, Calendly. Copy each webhook's signing secret into Hair Secrets (names below). |
| 8 | Claude via Lovable | Hair project: run `1-hair-switch-on.sql`. This turns on Legal's 62 automations, live updates for 6 tables, and 3 timed jobs. Tested locally with `scripts/legal-move/test-switch-over.mjs`. |
| 9 | Claude via Lovable | Legal project: run `2-legal-switch-off.sql`. This pauses the old app's timed jobs so nothing is sent twice. |
| 10 | Claude + Peter | Test: a call and a text to Peter's own phone from Legal Sales Call; a test lead through the lead form; Leads, Inbox and Appointments show today's records. |
| 11 | Peter OKs | Firms: from Legal Firms, use each firm's portal setup button to send its "set your password" email. |
| 12 | Peter | Tell Nina and Bec to use the Hair app (Legal side). The old app stays as a read-only backup. |

## Hair Secrets still to add on the day (all with `LEGAL_` in front)

These exist only in the Legal project's Secrets, where Lovable hides the
values. Peter copies each value from where it came from originally.

- Webhook signing keys (from each company's webhook page):
  `LEGAL_SQUARE_WEBHOOK_SIGNATURE_KEY`, `LEGAL_STRIPE_WEBHOOK_SECRET`,
  `LEGAL_BOLD_STRIPE_WEBHOOK_SECRET`, `LEGAL_STRIPE_LEGAL_WEBHOOK_SECRET`,
  `LEGAL_ANNATURE_WEBHOOK_SECRET`, `LEGAL_BOLD_ANNATURE_WEBHOOK_SECRET`.
- Settings: `LEGAL_FIRM_BOOKING_SMS_ENABLED` (true/false),
  `LEGAL_FIRM_BOOKING_SMS_FROM` (one of the Legal numbers),
  `LEGAL_BOLD_OFFERS_MODE`, `LEGAL_BOLD_OFFERS_LIVE_ENABLED`,
  `LEGAL_BOLD_COMPANY_APPROVED`, `LEGAL_BOLD_TEMPLATE_APPROVED_VERSION`
  (currently `bold-combined-2026-10-21-v5` in the code),
  `LEGAL_BOLD_ANNATURE_ACCOUNT_ID`, `LEGAL_BOLD_ANNATURE_DOWNLOAD_HOSTS`,
  `LEGAL_BOLD_COUNTERSIGNER_USER_ID` (the countersigner's **Hair** login id;
  Peter's is `d9db9a1a-1c88-4668-9aee-72e2f4c3e66f`),
  `LEGAL_META_AD_ACCOUNT_ID`, `LEGAL_META_CAMPAIGN_IDS`.
- Shared link secrets: `LEGAL_HANDOVER_LINK_SECRET` (signs handover links
  already emailed to firms), `LEGAL_FIRM_BOOKING_LEAD_SECRET` (whoever sends
  firm leads must use the same value), `LEGAL_INTERNAL_FUNCTION_SECRET`
  (optional; the timed jobs use the stored cron token). New values work for
  everything new, but links already sent with the old value stop working.

Not needed: `APP_URL`, `BOLD_OFFER_ORIGIN` and `PUBLIC_BASE_URL` default to
https://boldfamilylaw.com.au.

## Not moved yet

- Peter's morning ad-briefing phone call needs live audio streaming, which the
  Hair app doesn't support yet. It keeps running from the old app.
- 2 firm-offer files the admin sign-in can't read (Legal storage).

## Undo

Remove `LEGAL_LIVE` (or set it to false) and publish: the Hair app goes back to
showing the old app. Move the domain back to the Legal project, re-enable the old
jobs (`cron.alter_job(jobid, active := true)`), and change the two Twilio numbers
back. Records created in the Hair app meanwhile stay in its `legal_` tables.

## Switch-over log, 28 Nov 2026

- Final copy: 76 tables, 9,659 records, counts match; 13 stored files; 8 law
  firm logins created (no emails sent).
- Hair secrets: `LEGAL_LIVE=true`, `LEGAL_FIRM_BOOKING_SMS_ENABLED=true`,
  `LEGAL_FIRM_BOOKING_SMS_FROM=+61495051956` (the number Legal already texts
  firms from). Handover link and internal secrets are derived by the app.
  Stripe isn't used.
- Hair app published; boldfamilylaw.com.au (and www) moved from the Legal
  project to the Hair project. It is **not** the Hair project's main address,
  so hairtransplantgroup.lovable.app doesn't redirect. Lovable suggests updating
  the GoDaddy A record to 185.41.148.252 (works for now on the old IP).
- Twilio: all 6 Legal numbers ring boldfamilylaw.com.au.
- Hair database: 62 Legal automations on, 6 tables streaming live updates.
  Timed jobs are Lovable managed schedules, because Cloud won't take hand-written
  HTTP cron. They ring `/api/public/legal-cron/*`, which check the scheduler's
  signature and pass the call to Legal's doorbell with the app's internal
  secret. The old app's 4 jobs are paused.
- Still open: Square and Annature signing keys (Peter); the 2 Annature
  endpoints still point at family-law-floater.lovable.app; a test call and
  text; firm set-password emails.
- Tests 28 Nov: a text from the Legal inbox reached Peter, its delivery status
  came back ("sent"), and Peter's reply showed in the Legal inbox. Peter rang
  0495 051 956 and it logged as an inbound Legal call. Annature now sends to
  boldfamilylaw.com.au (new endpoints; the old two are disabled, not deleted).
  Not proven: an outgoing call from the browser dialler. It sat on
  "Connecting…" with no Twilio attempt, probably because the tab was in the
  background (no microphone).

## Handover review, 28 Nov 2026 (afternoon)

Walked every Legal screen live (hairtransplantgroup.lovable.app and
boldfamilylaw.com.au) and fixed what wasn't right:

- **Old-app leftovers:** CRM (Legal), To Do (Legal), the "Connect Legal Group"
  sign-in box and the "open in Legal app" links now use the Hair app's Legal
  records and sign-in. The copy page is locked (it would overwrite live work).
- **Menu:** a Legal section (Legal Dashboard, Firms, Firm Cold Calling, Firm
  Portal, Ad Briefing, Legal Settings), shown per the person's Legal role.
  Legal screens enforce the Legal app's page rules.
- **Firm Portal:** it looped forever (an unstable navigate helper); fixed for
  every Legal page.
- **Public files:** the Bold logo, firm-portal guide video, pay-per-show
  video and the dialler's Twilio script were missing. That's why outgoing Legal
  calls hung on "Connecting…". Firms now shows the ringing switch as Connected.
- **Pages' own titles and stylesheets** (from head()) are applied; the
  pay-per-show page layout is correct.
- **boldfamilylaw.com.au:** Legal Group branding on sign-in (Bold logo, blue
  button), tab title and icon; home opens the Legal dashboard.
- **Leads:** form answers read as text ("If me and my ex sold everything…").
- **Checked fine:** Leads, Sales Call, Messages, Appointments, Numbers,
  Training, Leaderboard, Transcripts, Pitch deck, Legal Dashboard, Firms, Legal
  Settings, Firm Portal (4 firms), portal guide, deposit-confirmed, firm offer
  and set-password (sensible states without a link). Hair Leads and Dashboard
  are unaffected. Firm invite links may return to boldfamilylaw.com.au (auth
  redirect list includes it).
- **Note:** after each publish, a browser holding the old version shows it
  until reloaded.

## Sales calls and partner portals, 28 Nov 2026 (late afternoon)

- **Legal calling fixed:** Twilio refused the Legal browser phone ("JWT signature
  validation failed": the pasted LEGAL_TWILIO_API_KEY_SECRET doesn't match its
  key ID). Legal and Hair share one Twilio account, so Legal now signs with the
  portal's working API key pair (runtime/env.ts). Firms "Ring me for firm
  callbacks" shows Ready for calls; a test call from the Legal dialler rang
  Peter's mobile and connected.
- **Legal Sales Call:** session starts, client loads with all 10 steps, details,
  call history and autosaved notes; it only dials when Call is pressed.
- **Hair Sales Call:** unchanged code; page loads, Hair phone registers. Not
  started (Hair can auto-dial).
- **Hair partner portals:** Partner Clinics and a clinic's portal view (credits,
  appointments, availability) work as before.
- **Legal firm portal:** the partner-firm list and a firm's own portal (credits,
  offices, appointments) work; addresses no longer carry test labels.
- The 4 public firm/client pages and sign-in show Legal Group branding on
  boldfamilylaw.com.au.

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
| 7 | Peter, Claude guides | Square, Stripe (Bold and Legal accounts), Annature, Calendly: check each webhook address. Change any `family-law-floater.lovable.app` ones to `boldfamilylaw.com.au` (same path). Copy each webhook's signing secret into Hair Secrets (names below). |
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

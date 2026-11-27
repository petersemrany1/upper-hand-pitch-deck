# Moving the Legal app into the Upper Hand (Hair) app

Goal: everything the Legal Group app does runs inside the Hair app, on the Hair
app's database, so the Legal app can be switched off. Both apps run side by
side until the switch-over, and nothing changes for the Legal team or the law
firms before then.

## In plain English

The Legal app is roughly the size of the Hair app (about 99,000 lines of code,
76 database tables, 23 "doorbells" that outside services ring, 4 timed jobs).
We move it in stages. Each stage is checked before the next one starts.

| Stage | What happens | What Peter does |
|---|---|---|
| 1. Make room | A separate "Legal" area in the Hair database, so Legal's records never mix with Hair's (14 tables have the same names in both apps). | Nothing |
| 2. Bring the engine | The Legal app's behind-the-scenes code is copied into the Hair app, pointed at that Legal area. Screens keep showing the old app until stage 5. | Nothing |
| 3. Connect accounts | The Hair app gets its own copy of Legal's account keys. | Log in to each company and paste one key into Lovable (I walk you through each): Twilio, ElevenLabs, Anthropic, OpenAI, Square, Stripe (Bold), Annature, Calendly, Resend, Meta |
| 4. Copy records | All Legal records are copied into the Legal area, and kept topped up while both apps run. | Nothing |
| 5. Switch screens | Each Legal screen in the Hair app starts using the copied engine and records. We compare against the old app. | Spot-check |
| 6. Switch over | Phone numbers, payment and contract webhooks, lead forms, firm logins and the boldfamilylaw.com.au address move to the Hair app on a quiet evening. Old app stays as a read-only backup. | Say go; firms get a "set your password" email |
| 7. Switch off | After a settling period, the Legal app is turned off. | Say go |

## Technical approach

- **Naming.** Every Legal table, view, function, type and trigger is created
  in the Hair database with a `legal_` prefix (`client_leads` →
  `legal_client_leads`). A separate Postgres schema would be cleaner, but
  Lovable Cloud only exposes `public` to the Data API. The rename is done by a
  script (`scripts/legal-move/`), never by hand, so it can be re-run as the
  Legal app keeps changing.
- **Schema.** The script rewrites Legal's 91 migrations into one consolidated
  migration and replays it locally (PGlite with stubbed `auth`, `storage`,
  `cron`, `net`) on top of the Hair schema before anything goes to Lovable.
- **Code.** Legal server and client code lives under `src/legal/`. The same
  script rewrites `.from("x")`, `.rpc("f")`, storage buckets and env names
  (`TWILIO_AUTH_TOKEN` → `LEGAL_TWILIO_AUTH_TOKEN`). Legal API routes mount
  under `/api/public/legal/...`, so the 23 webhooks need a new URL only at
  switch-over.
- **People.** Legal staff sign in with their Hair accounts. `legal_sales_reps.user_id`
  and other `auth.users` references are remapped by email during the copy. Law
  firm users get Hair auth accounts at switch-over, plus a set-password email.
- **Data copy.** An admin-only export function in the Legal database pages out
  each table as JSON. A Hair server route imports it, keeps ids, and remaps
  user ids. It is re-runnable (upsert by id) so it can top up until switch-over.
- **Cron.** The 4 Legal jobs (`firm-booking-follow-ups`,
  `legal-meta-spend-daily`, `qualified-client-call-hooks`, reminders) are
  created disabled and enabled at switch-over, so nothing double-sends.
- **Domain.** boldfamilylaw.com.au moves last. The Hair app serves Legal's
  public pages (marketing, firm portal, firm offers, deposits) when the request
  host is the Legal domain.

## Safety rules for the move

- Nothing sends a text, makes a call, charges a card or emails a firm from the
  Hair app until stage 6. Until then, the copied engine runs in "shadow" mode,
  with its outbound actions turned off by `LEGAL_LIVE=false`.
- The old Legal app is never changed except for read-only export functions.
- Each stage is pushed to the preview and checked against the old app first.

## Progress

- **2026-11-27 — Stage 1 done.** Legal layout applied to the Hair database as
  nine migrations (`*_legal_schema_part01..09.sql`): 76 tables, 84 functions,
  190 policies, all triggers disabled. Legal storage buckets and their (Legal-
  bucket-scoped) policies are generated but not yet created
  (`generate-schema.mjs --storage`).
- **2026-11-27 — Stage 4 first copy done.** `/legal-move` copied all 76 tables,
  9,632 records, counts match. Re-run it any time to top up. Not yet copied:
  the 15 stored files (firm offers, training media, a practice recording).
- **2026-11-27 — Stage 2 engine copied in (not switched on).**
  `scripts/legal-port/port.py --all` brings all Legal code into `src/legal/`
  (426 files, 27 staff pages). Runtime stand-ins: `runtime/prefix.ts` (legal_
  table/function/bucket translation), `runtime/env.ts` (LEGAL_ settings only),
  `runtime/router.tsx` (Legal links to portal sections), `runtime/mode.ts`
  (each page reads the Legal app's database until switched to "portal").
- **2026-11-28 — People matched, files copied, first screen proven.** The
  copier matches Legal staff to portal logins by email (the admin running it is
  linked to their own portal login even with a different email; that wins over
  an email match). Matched: Peter (admin123@admin.com) and Bec. No portal login
  yet: Nina (nina@bold-marketing.com.au), rep.test, solutionslanehq,
  solotuionslanehq, and Peter's second Legal login (petersemrany1@gmail.com).
  Stored files: 13 copied into private `legal-` buckets (12 training, 1
  practice recording); the 2 firm-offer files can't be read with an admin
  sign-in and still need copying. Leads tried on the copied records
  (`/leads?biz=legal&legalData=portal`) matches the Legal app line for line
  (228 leads). No page is switched for everyone: the copy is a snapshot, so
  pages switch at switch-over (or once the copy is kept live).
- Next: give Nina a portal login, then re-run the copy; try the other screens
  with `legalData=portal`; mount Legal's API routes under `/api/public/legal/…`
  (disabled); apply the `legal-` storage rules; Stage 3 (accounts) with Peter.

# Email setup: booking handover emails (updated October 2026)

## Summary
Booking handover emails to clinics are sent through a **Google Apps Script web app** running in the **admin@bold-patients.com** Google Workspace account. They are **not sent through Resend**.

**Why:** Clinics on Microsoft 365 (e.g. Gro Clinics) were silently junking or quarantining handovers sent through Resend (Amazon SES) from bold-patients.com. Testing in October 2026 showed the identical email scores as spam when sent through Resend (SCL 5) but lands in the Inbox when sent through Google (SCL 1). Do not switch handovers back to Resend.

## How it works
- The backend (never the frontend) sends an HTTP POST with a JSON body to the URL in secret `HANDOVER_MAILER_URL`.
- Follow redirects. A response of `{"ok": true}` means sent; log anything else as a failure.
- Secrets: `HANDOVER_MAILER_URL`, `HANDOVER_MAILER_SECRET`. Never expose either in frontend code.

## JSON fields
- `secret` (required): value of `HANDOVER_MAILER_SECRET`
- `to` (required): recipient(s), comma-separated
- `subject` (required)
- `text` (required): plain-text version
- `html` (optional): the HTML handover template
- `cc`, `bcc` (optional): comma-separated
- `fromName`: "Hair Transplant Group"
- `replyTo`: "peter@gobold.com.au"

## Current recipients (Gro Clinics)
- To: sydney@groclinics.com.au
- CC: russell@groclinics.com.au
- BCC: peter@gobold.com.au

## Notes
- Emails send from admin@bold-patients.com and appear in that account's Gmail Sent folder.
- Limit: about 1,500 recipients a day (Google Workspace Apps Script quota).
- The script converts emojis Gmail can't handle (e.g. 📞) automatically. Keep emojis out of subject lines.
- Other app emails sent only to internal Bold addresses may stay on Resend. Any email going to external clinics should use this mailer.
- The script lives at script.google.com ("Booking handover mailer", admin@bold-patients.com). After editing it, redeploy via Deploy → Manage deployments → New version. The URL stays the same.
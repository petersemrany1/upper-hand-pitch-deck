# Project rules

- Emails to external clinics (booking handovers) are sent server-side via the Google Apps Script mailer at `HANDOVER_MAILER_URL` (see docs/handover-email-mailer.md), never Resend — Microsoft 365 clinics junk Resend/SES mail from bold-patients.com. Internal-only emails may stay on Resend.

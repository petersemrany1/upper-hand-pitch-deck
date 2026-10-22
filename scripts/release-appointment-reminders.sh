#!/usr/bin/env bash
# One-time backend release. Only this feature's migrations/functions are deployed.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${REMINDER_DATABASE_URL:?Set REMINDER_DATABASE_URL to the intended Supabase PostgreSQL connection string}"
: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN for the intended Supabase account}"
reminder_project_ref="${REMINDER_PROJECT_REF:-sfwokpeeffgrkxaptqji}"
export REMINDER_PROJECT_REF="$reminder_project_ref"
command -v supabase >/dev/null || { echo 'Install the Supabase CLI before releasing.'; exit 1; }
command -v psql >/dev/null || { echo 'Install the PostgreSQL client before releasing.'; exit 1; }
command -v node >/dev/null
node --input-type=module - <<'JS'
const uri = new URL(process.env.REMINDER_DATABASE_URL);
const ref = process.env.REMINDER_PROJECT_REF;
if (!/^[a-z0-9]{20}$/.test(ref) || !(uri.hostname === `db.${ref}.supabase.co` || decodeURIComponent(uri.username) === `postgres.${ref}`)) {
  throw new Error('Database connection and project reference must identify the same Supabase project.');
}
JS
reminder_secrets="$(supabase secrets list --project-ref "$reminder_project_ref" --output json)"
printf '%s' "$reminder_secrets" | node --input-type=module -e '
let input=""; for await (const part of process.stdin) input+=part;
const names=new Set(JSON.parse(input).map(s=>s.name));
const missing=["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","RESEND_API_KEY"].filter(n=>!names.has(n));
if(missing.length) throw new Error("Configure these Edge Function secrets before release: "+missing.join(", "));
'
unset reminder_secrets
reminder_psql() { PGDATABASE="$REMINDER_DATABASE_URL" psql -X -v ON_ERROR_STOP=1 "$@"; }
reminder_vault_count="$(reminder_psql -Atc "SELECT count(DISTINCT name) FROM vault.decrypted_secrets WHERE name='internal_function_secret';")"
[[ "$reminder_vault_count" == '1' ]] || { echo 'The existing internal_function_secret must be present in database Vault.'; exit 1; }
reminder_psql -1 -f supabase/migrations/20261023010000_clinic_reminder_confirmation.sql -c "INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES('20261023010000','clinic_reminder_confirmation') ON CONFLICT(version) DO NOTHING;"
reminder_psql -1 -f supabase/migrations/20261023015000_sync_manual_appointment_confirmations.sql -c "INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES('20261023015000','sync_manual_appointment_confirmations') ON CONFLICT(version) DO NOTHING;"
supabase functions deploy send-appointment-reminders --project-ref "$reminder_project_ref"
supabase functions deploy sms-inbound --project-ref "$reminder_project_ref"
# A dry run sends no texts/emails. Never print the authorization header or patient payload.
reminder_request_id="$(reminder_psql -Atc "SELECT net.http_post(url:='https://$reminder_project_ref.supabase.co/functions/v1/send-appointment-reminders',headers:=jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_function_secret')),body:='{\"dry_run\":true}'::jsonb,timeout_milliseconds:=120000);")"
[[ "$reminder_request_id" =~ ^[0-9]+$ ]] || { echo 'Dry-run request could not be queued.'; exit 1; }
reminder_check=""
for reminder_attempt in {1..30}; do
  reminder_check="$(reminder_psql -Atc "SELECT CASE WHEN status_code=200 AND content::jsonb->>'mode'='dry_run' AND content::jsonb->>'ok'='true' THEN 'passed' ELSE 'failed' END FROM net._http_response WHERE id=$reminder_request_id;")"
  [[ -n "$reminder_check" ]] && break
  sleep 1
done
[[ "$reminder_check" == 'passed' ]] || { echo 'Dry run did not pass. Review reminder function logs before activating the scheduler.'; exit 1; }
reminder_psql -1 -f supabase/migrations/20261023020000_schedule_clinic_confirmation_reminders.sql -c "INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES('20261023020000','schedule_clinic_confirmation_reminders') ON CONFLICT(version) DO NOTHING;"
echo 'Backend released. Publish the matching application changes, then open Appointments → Clinic reminder settings.'

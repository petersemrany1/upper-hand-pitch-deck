// Read-only deployment check. Run with the server environment loaded:
// bun scripts/check-invoice-setup.ts
import { createClient } from "@supabase/supabase-js";
const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "LOVABLE_API_KEY",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length)
  throw new Error(
    `Missing server settings: ${missing.join(", ")}. Do not put secrets in client variables.`,
  );
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const [config, reps, bucket, tracking] = await Promise.all([
  db.from("rep_invoice_config").select("rep_id,hourly_rate_cents,timezone"),
  db.from("sales_reps").select("id,name,email,is_active"),
  db.storage.getBucket("rep-invoices"),
  db.from("rep_invoice_tracking").select("started_at").single(),
]);
for (const r of [config, reps, bucket, tracking])
  if (r.error) throw new Error(r.error.message);
const configured = (config.data ?? []).map((c) => ({
  ...c,
  rep: reps.data?.find((r) => r.id === c.rep_id),
}));
const nina = configured.filter(
  (c) =>
    c.rep?.email?.toLowerCase() === "sinclair.nina1@gmail.com" &&
    c.rep.is_active &&
    c.hourly_rate_cents === 2500,
);
const bec = configured.filter(
  (c) =>
    /^(bec|rebecca)(\s|$)/i.test(c.rep?.name ?? "") &&
    c.rep?.is_active &&
    c.hourly_rate_cents === 3500,
);
if (nina.length !== 1 || bec.length !== 1)
  throw new Error(
    "Confirm Nina and Bec's sales_reps identities and configure their invoice rates before enabling approvals.",
  );
if (configured.some((c) => c.timezone !== "Australia/Perth"))
  throw new Error("Invoice date boundaries must use the agreed WA timezone.");
if (bucket.data?.public || bucket.data?.file_size_limit !== 5242880)
  throw new Error("Invoice storage must be private with a 5 MB limit.");
console.log(
  "PASS: invoice schema, private storage, Nina $25/hour, Bec $35/hour and server email settings are configured. No email was sent.",
);
console.log(
  `Verified tracking starts ${tracking.data?.started_at}; earlier invoices require review.`,
);

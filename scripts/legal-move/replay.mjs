// Replays SQL migrations in a throwaway in-memory Postgres (PGlite) with the
// Supabase pieces they rely on stubbed out. Usage:
//   node scripts/legal-move/replay.mjs <dir-or-file>...   (in order)
// Exits non-zero and names the first migration that fails.
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const PGLITE =
  process.env.PGLITE_MODULE ??
  join(homedir(), "Documents/GitHub/family-law-floater/node_modules/@electric-sql/pglite/dist/index.js");
const { PGlite } = await import(PGLITE);
const { pgcrypto } = await import(PGLITE.replace(/index\.js$/, "contrib/pgcrypto.js"));

export const STUBS = `
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE ROLE authenticator;
CREATE ROLE supabase_admin; CREATE ROLE postgres_rls;
CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE SCHEMA storage; CREATE SCHEMA cron; CREATE SCHEMA net;
CREATE SCHEMA vault; CREATE SCHEMA realtime; CREATE SCHEMA supabase_functions; CREATE SCHEMA graphql_public;
CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, phone text,
  raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(),
  last_sign_in_at timestamptz, email_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz,
  encrypted_password text, confirmed_at timestamptz, updated_at timestamptz, is_anonymous boolean DEFAULT false,
  instance_id uuid, aud text, role text, recovery_token text, confirmation_token text, email_change text,
  email_change_token_new text, recovery_sent_at timestamptz, is_super_admin boolean, is_sso_user boolean DEFAULT false);
CREATE TABLE auth.identities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, provider text, identity_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('test.role',true),''),'authenticated')$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;
CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$SELECT auth.jwt()->>'email'$$;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean DEFAULT false, file_size_limit bigint,
  allowed_mime_types text[], owner uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid,
  metadata jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), path_tokens text[]);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
CREATE FUNCTION storage.filename(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT (string_to_array(name,'/'))[array_length(string_to_array(name,'/'),1)]$$;
CREATE FUNCTION storage.extension(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT reverse(split_part(reverse(name),'.',1))$$;
CREATE TABLE cron.job(jobid bigserial PRIMARY KEY, jobname text UNIQUE, schedule text, command text, active boolean DEFAULT true);
CREATE FUNCTION cron.schedule(jobname text, schedule text, command text) RETURNS bigint LANGUAGE sql AS
  $$INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3) ON CONFLICT(jobname) DO UPDATE SET schedule=excluded.schedule, command=excluded.command RETURNING jobid$$;
CREATE FUNCTION cron.unschedule(jobname text) RETURNS boolean LANGUAGE sql AS $$DELETE FROM cron.job WHERE jobname=$1 RETURNING true$$;
CREATE FUNCTION cron.unschedule(jobid bigint) RETURNS boolean LANGUAGE sql AS $$DELETE FROM cron.job WHERE jobid=$1 RETURNING true$$;
CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}', params jsonb DEFAULT '{}', headers jsonb DEFAULT '{}', timeout_milliseconds int DEFAULT 5000) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
CREATE FUNCTION net.http_get(url text, params jsonb DEFAULT '{}', headers jsonb DEFAULT '{}', timeout_milliseconds int DEFAULT 5000) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
CREATE TABLE vault.decrypted_secrets(id uuid DEFAULT gen_random_uuid(), name text, decrypted_secret text);
CREATE FUNCTION vault.create_secret(secret text, name text DEFAULT NULL, description text DEFAULT NULL) RETURNS uuid LANGUAGE sql AS $$INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES($2,$1) RETURNING id$$;
CREATE PUBLICATION supabase_realtime;
-- Seed rows in migrations point at real auth users; skip FK checks locally.
SET session_replication_role = replica;
`;

// Statements PGlite can't run but that are harmless to skip locally.
function localise(sql) {
  return sql
    .replace(/CREATE EXTENSION[^;]*;/gi, "")
    .replace(/ALTER PUBLICATION supabase_realtime[^;]*;/gi, "")
    .replace(/ALTER DEFAULT PRIVILEGES[^;]*;/gi, "");
}

async function files(paths) {
  const out = [];
  for (const p of paths) {
    if ((await stat(p)).isDirectory())
      out.push(...(await readdir(p)).filter((f) => f.endsWith(".sql")).sort().map((f) => join(p, f)));
    else out.push(p);
  }
  return out;
}

export async function replay(paths, { quiet = false, keepGoing = false } = {}) {
  const skipped = [];
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec("CREATE EXTENSION pgcrypto");
  await db.exec(STUBS);
  const list = await files(paths);
  for (const f of list) {
    try {
      await db.exec(localise(await readFile(f, "utf8")));
    } catch (e) {
      if (keepGoing) { skipped.push({ file: f, error: e.message }); continue; }
      return { ok: false, db, file: f, error: e.message, done: list.indexOf(f), total: list.length };
    }
  }
  if (!quiet) console.log(`replayed ${list.length} migrations`);
  return { ok: true, db, total: list.length, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const keepGoing = process.argv.includes("--keep-going");
  const r = await replay(process.argv.slice(2).filter((a) => a !== "--keep-going"), { keepGoing });
  for (const s of r.skipped ?? []) console.error(`skipped ${s.file.split("/").pop()}: ${s.error}`);
  if (!r.ok) {
    console.error(`FAILED at ${r.done + 1}/${r.total}: ${r.file}\n${r.error}`);
    process.exit(1);
  }
}

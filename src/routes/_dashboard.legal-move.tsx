import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { RequireLegal } from "@/components/business/LegalConnect";
import { legalDb } from "@/lib/legal/client";
import { LEGAL_TABLES } from "@/legal/move/manifest";
import {
  importLegalRowsFn,
  legalCopyCountsFn,
  legalCreateFirmLoginsFn,
  legalStorageCountsFn,
  legalStorageUploadLinksFn,
  legalUserMapFn,
  listAll,
} from "@/utils/legal-move.functions";
import { supabase } from "@/integrations/supabase/client";

// Admin tool for the Legal move (docs/legal-move-plan.md): copies every Legal
// record into this database's legal_ tables and compares the counts. Safe to
// re-run; rows are matched by their Legal ids. Not in the menu.
export const Route = createFileRoute("/_dashboard/legal-move")({
  component: LegalMovePage,
});

type Line = { table: string; legal: number; copied: number; state: "waiting" | "copying" | "done" | "failed"; error?: string };

const PAGE = 500;

async function exportPage(table: string, offset: number): Promise<Record<string, unknown>[]> {
  const { data, error } = await legalDb().rpc("portal_table_export", { p_table: table, p_offset: offset, p_limit: PAGE });
  if (error) throw new Error(`Reading Legal ${table}: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

async function exportAll(table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await exportPage(table, offset);
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

type Login = { id: string; email: string | null; firm: boolean };

/** Every Legal login; law firm logins are marked (they match a portal login once one exists). */
async function legalLogins(): Promise<Login[]> {
  const firmUsers = new Set((await exportAll("firm_portal_users")).map((r) => String(r.id)));
  const users: Login[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await legalDb().rpc("portal_auth_users_export", { p_offset: offset });
    if (error) throw new Error(`Reading Legal logins: ${error.message}`);
    const page = (data ?? []) as { id: string; email: string | null }[];
    users.push(...page.map((u) => ({ id: u.id, email: u.email, firm: firmUsers.has(u.id) })));
    if (page.length < 1000) return users;
  }
}

function LegalMovePage() {
  const importRows = useServerFn(importLegalRowsFn);
  const counts = useServerFn(legalCopyCountsFn);
  const userMap = useServerFn(legalUserMapFn);
  const uploadLinks = useServerFn(legalStorageUploadLinksFn);
  const createFirmLogins = useServerFn(legalCreateFirmLoginsFn);
  const [firms, setFirms] = useState<string | null>(null);

  // Switch-over only: a portal login for each law firm login (nothing is sent).
  async function makeFirmLogins() {
    if (!window.confirm("Create a portal login for every Legal law firm login? No emails are sent. Do this on switch-over day.")) return;
    setFirms("Creating firm logins…");
    try {
      const firmLogins = (await legalLogins()).filter((l) => l.firm).map(({ id, email }) => ({ id, email }));
      const res = await createFirmLogins({ data: { users: firmLogins } });
      setFirms(
        `Firm logins: ${res.created.length} created, ${res.reused.length} already existed` +
          (res.failed.length ? `; problems: ${res.failed.join("; ")}` : "") +
          ". Now run “Copy all Legal records” again so firm records point at them.",
      );
    } catch (e) {
      setFirms(`Couldn't create firm logins: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const storageCounts = useServerFn(legalStorageCountsFn);
  const [files, setFiles] = useState<string | null>(null);
  const [people, setPeople] = useState<{ matched: string[]; unmatched: string[] } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const update = (table: string, patch: Partial<Line>) =>
    setLines((all) => all.map((l) => (l.table === table ? { ...l, ...patch } : l)));

  async function run() {
    setRunning(true);
    setSummary(null);
    setLines(LEGAL_TABLES.map((t) => ({ table: t.name, legal: 0, copied: 0, state: "waiting" })));
    const all: Record<string, Record<string, unknown>[]> = {};
    let failed = 0;
    // Legal staff are matched to their portal logins by email; the copy points at those.
    let users: Record<string, string> = {};
    try {
      const { data: me } = await legalDb().auth.getUser();
      const logins = await legalLogins();
      const res = await userMap({ data: { users: logins.map(({ id, email }) => ({ id, email })), me: me.user?.id } });
      const firmEmails = new Set(logins.filter((l) => l.firm).map((l) => l.email));
      res.unmatched = res.unmatched.map((e) => (firmEmails.has(e) ? `${e} (law firm)` : e));
      users = res.map;
      setPeople({ matched: res.matched, unmatched: res.unmatched });
    } catch (e) {
      setSummary(`Couldn't match Legal staff to portal logins: ${e instanceof Error ? e.message : String(e)}`);
      setRunning(false);
      return;
    }
    // Pass 1: every row, parents first, with self/cyclic links left empty.
    for (const t of LEGAL_TABLES) {
      update(t.name, { state: "copying" });
      try {
        const rows = await exportAll(t.name);
        all[t.name] = rows;
        let copied = 0;
        for (let i = 0; i === 0 || i < rows.length; i += 200) {
          const res = await importRows({ data: { table: t.name, rows: rows.slice(i, i + 200), pass: "rows", first: i === 0, users } });
          copied += res.written;
          update(t.name, { legal: rows.length, copied });
        }
        update(t.name, { legal: rows.length, copied, state: t.deferred.length ? "copying" : "done" });
      } catch (e) {
        failed++;
        update(t.name, { state: "failed", error: e instanceof Error ? e.message : String(e) });
      }
    }
    // Pass 2: fill in the self/cyclic links now that every row exists.
    for (const t of LEGAL_TABLES.filter((t) => t.deferred.length && all[t.name])) {
      try {
        const rows = all[t.name]!;
        for (let i = 0; i < rows.length; i += 200)
          await importRows({ data: { table: t.name, rows: rows.slice(i, i + 200), pass: "links", users } });
        update(t.name, { state: "done" });
      } catch (e) {
        failed++;
        update(t.name, { state: "failed", error: e instanceof Error ? e.message : String(e) });
      }
    }
    // Pass 3: remove earlier copies still keyed by a Legal login id (children first).
    for (const t of [...LEGAL_TABLES].reverse().filter((t) => all[t.name])) {
      try {
        const rows = all[t.name]!;
        for (let i = 0; i < rows.length; i += 200)
          await importRows({ data: { table: t.name, rows: rows.slice(i, i + 200), pass: "cleanup", users } });
      } catch (e) {
        failed++;
        update(t.name, { state: "failed", error: e instanceof Error ? e.message : String(e) });
      }
    }
    // Check: every table here has exactly as many rows as Legal had.
    const here = await counts();
    const mismatched = LEGAL_TABLES.filter((t) => all[t.name] && here[t.name] !== all[t.name]!.length);
    for (const t of mismatched)
      update(t.name, { state: "failed", error: `Legal has ${all[t.name]!.length}, here ${here[t.name]}` });
    const total = Object.values(all).reduce((n, r) => n + r.length, 0);
    setSummary(
      failed || mismatched.length
        ? `${failed + mismatched.length} table(s) need attention.`
        : `All ${LEGAL_TABLES.length} tables copied: ${total.toLocaleString()} records, counts match.`,
    );
    setRunning(false);
  }

  // Stored files (training media, firm offers, practice recordings): read from
  // Legal with the admin's Legal sign-in, uploaded here through one-time links.
  async function copyFiles() {
    setFiles("Copying stored files…");
    try {
      const buckets = ["firm-contracts", "firm-offers", "practice-call-recordings", "training-media"];
      const found: { bucket: string; name: string }[] = [];
      for (const bucket of buckets)
        for (const name of await listAll(legalDb().storage.from(bucket) as never, "")) found.push({ bucket, name });
      const { links } = await uploadLinks({ data: { files: found } });
      const problems: string[] = [];
      for (const l of links) {
        const { data: blob, error } = await legalDb().storage.from(l.bucket).download(l.name);
        if (error || !blob) {
          problems.push(`${l.bucket}/${l.name}: ${error?.message ?? "no file"}`);
          continue;
        }
        const { error: up } = await supabase.storage.from(`legal-${l.bucket}`).uploadToSignedUrl(l.path, l.token, blob, {
          contentType: blob.type || undefined,
        });
        if (up) problems.push(`${l.bucket}/${l.name}: ${up.message}`);
      }
      const here = await storageCounts();
      const summary = buckets
        .map((b) => `${b}: Legal ${found.filter((f) => f.bucket === b).length}, here ${here[b]?.length ?? 0}`)
        .join(" · ");
      setFiles(`${summary}${problems.length ? ` — problems: ${problems.join("; ")}` : ""}`);
    } catch (e) {
      setFiles(`Couldn't copy stored files: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Legal move: copy records</h1>
        <p className="text-sm" style={{ color: "#6b6b68" }}>
          Copies every Legal Group record into this portal's Legal area and checks the counts match. Nothing is
          sent to clients or firms. Safe to run again.
        </p>
      </div>
      <RequireLegal>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "#1e40af" }}
          >
            {running ? "Copying…" : "Copy all Legal records"}
          </button>
          <button
            type="button"
            onClick={copyFiles}
            disabled={running}
            className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            Copy stored files
          </button>
          <button
            type="button"
            onClick={makeFirmLogins}
            disabled={running}
            className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            Create firm logins (switch-over)
          </button>
          {summary && <span className="text-sm font-medium">{summary}</span>}
        </div>
        {files && <p className="mt-3 text-sm">{files}</p>}
        {firms && <p className="mt-3 text-sm">{firms}</p>}
        {people && (
          <p className="mt-3 text-sm">
            Matched {people.matched.length} Legal staff to their portal logins ({people.matched.join(", ")})
            {people.unmatched.length ? `; no portal login yet: ${people.unmatched.join(", ")}` : "."}
          </p>
        )}
        {lines.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "#6b6b68" }}>
                <th className="py-1">Table</th>
                <th className="py-1 text-right">Legal</th>
                <th className="py-1 text-right">Copied</th>
                <th className="py-1 pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.table} className="border-t" style={{ borderColor: "#ebebeb" }}>
                  <td className="py-1 font-mono text-xs">{l.table}</td>
                  <td className="py-1 text-right tabular-nums">{l.legal}</td>
                  <td className="py-1 text-right tabular-nums">{l.copied}</td>
                  <td className="py-1 pl-3">
                    {l.state === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {l.state === "copying" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {l.state === "failed" && (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" /> {l.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RequireLegal>
    </div>
  );
}

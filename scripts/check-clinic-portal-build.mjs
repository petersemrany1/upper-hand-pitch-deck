// Run after npm run build. Regression check for the stale action-chunk 404
// reported by Nitai: all clinic patient actions must load with the portal.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const assets = new URL("../.output/public/assets/", import.meta.url);
const names = await readdir(assets);
const portals = names.filter((name) => /^ClinicPortalView-.*\.js$/.test(name));
assert.equal(portals.length, 1, "Expected one built clinic portal module");
const code = await readFile(new URL(portals[0], assets), "utf8");
assert.doesNotMatch(code, /\bimport\s*\(/, "Clinic actions must not download a chunk on click");
for (const match of code.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+)["']/g)) {
  const name = match[1].slice(2);
  assert(names.includes(name), `Missing static portal dependency: ${name}`);
}
console.log("Clinic portal build verified: no delayed action imports; static dependencies exist.");

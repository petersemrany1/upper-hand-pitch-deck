// Ported from the Legal app (family-law-floater/src/lib/legal-spend-oidc.server.ts). Re-run the port script to refresh.
import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
export const SPEND_AUDIENCE =
  "https://boldfamilylaw.com.au/api/public/legal/hooks/import-legal-meta-spend";
const REPO = "petersemrany1/family-law-floater";
type SigningKey = JsonWebKey & { kid: string; alg?: string; use?: string };
let cached: { keys: SigningKey[]; at: number } | undefined;

export async function verifySpendWorkflowToken(
  token: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  if (token.length > 16000) throw new Error("Invalid workflow identity");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid workflow identity");
  const [head, body, signature] = parts as [string, string, string];
  const header = JSON.parse(Buffer.from(head, "base64url").toString()) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg !== "RS256" || !header.kid)
    throw new Error("Invalid workflow signature algorithm");
  let keys = fetcher === fetch && cached && now - cached.at < 300000 ? cached.keys : undefined;
  if (!keys?.some((k) => k.kid === header.kid)) {
    const response = await fetcher(`${ISSUER}/.well-known/jwks`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Workflow identity provider unavailable");
    keys = ((await response.json()) as { keys: SigningKey[] }).keys;
    if (!Array.isArray(keys)) throw new Error("Invalid signing keys");
    if (fetcher === fetch) cached = { keys, at: now };
  }
  const jwk = keys.find(
    (k) =>
      k.kid === header.kid &&
      k.kty === "RSA" &&
      (!k.alg || k.alg === "RS256") &&
      (!k.use || k.use === "sig"),
  );
  if (
    !jwk ||
    !verify(
      "RSA-SHA256",
      Buffer.from(`${head}.${body}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(signature, "base64url"),
    )
  )
    throw new Error("Invalid workflow signature");
  const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>;
  const sec = now / 1000;
  if (
    claims["iss"] !== ISSUER ||
    ![
      `repo:${REPO}:ref:refs/heads/main`,
      "repo:petersemrany1@276492086/family-law-floater@1355387499:ref:refs/heads/main",
    ].includes(String(claims["sub"])) ||
    claims["aud"] !== SPEND_AUDIENCE ||
    claims["repository"] !== REPO ||
    claims["repository_id"] !== "1355387499" ||
    claims["repository_owner_id"] !== "276492086" ||
    claims["ref"] !== "refs/heads/main" ||
    claims["workflow_ref"] !== `${REPO}/.github/workflows/legal-meta-spend.yml@refs/heads/main` ||
    claims["runner_environment"] !== "github-hosted" ||
    !["schedule", "workflow_dispatch"].includes(String(claims["event_name"])) ||
    typeof claims["exp"] !== "number" ||
    claims["exp"] <= sec ||
    typeof claims["nbf"] !== "number" ||
    claims["nbf"] > sec + 30 ||
    typeof claims["iat"] !== "number" ||
    claims["iat"] > sec + 30 ||
    claims["iat"] < sec - 600
  )
    throw new Error("Workflow identity is not authorised for this import");
  return { runId: String(claims["run_id"]), attempt: String(claims["run_attempt"]) };
}

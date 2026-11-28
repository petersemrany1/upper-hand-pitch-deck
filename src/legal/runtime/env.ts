// Legal app code reads its settings through this instead of process.env, so
// it only ever sees LEGAL_-prefixed values (TWILIO_AUTH_TOKEN reads
// LEGAL_TWILIO_AUTH_TOKEN). It can never pick up the Hair app's Twilio, Square
// or Stripe keys. Names that already start with LEGAL_ and the portal
// database connection pass through unchanged.
const PASSTHROUGH = new Set(["NODE_ENV", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);

export function legalEnvName(name: string): string {
  return PASSTHROUGH.has(name) || name.startsWith("LEGAL_") ? name : `LEGAL_${name}`;
}

const raw = (): Record<string, string | undefined> =>
  typeof process === "undefined" ? {} : (process.env as Record<string, string | undefined>);

// Legal keys can be added ahead of switch-over: until LEGAL_LIVE=true, Legal
// code sees none of them (only the portal database connection), so it can't
// call, text, email, charge or spend on AI from this app early.
// Plain addresses (not keys) the Legal app needs and that are the same for
// everyone once boldfamilylaw.com.au points here. A LEGAL_ value overrides them.
const DEFAULTS: Record<string, string> = {
  LEGAL_APP_URL: "https://boldfamilylaw.com.au",
  LEGAL_BOLD_OFFER_ORIGIN: "https://boldfamilylaw.com.au",
};

const source = (): Record<string, string | undefined> => {
  const env = raw();
  if (env.LEGAL_LIVE === "true") {
    // Signs the conflict links in firm handover emails. Without its own value,
    // it's derived from this app's server key (never sent to browsers).
    const derived = env.SUPABASE_SERVICE_ROLE_KEY ? { LEGAL_HANDOVER_LINK_SECRET: `legal-handover:${env.SUPABASE_SERVICE_ROLE_KEY}` } : {};
    return { ...DEFAULTS, ...derived, ...env };
  }
  return Object.fromEntries(Object.entries(env).filter(([k]) => PASSTHROUGH.has(k) || k === "LEGAL_LIVE"));
};

export const legalEnv: Record<string, string | undefined> = new Proxy({} as Record<string, string | undefined>, {
  get(_, key) {
    return typeof key === "string" ? source()[legalEnvName(key)] : undefined;
  },
  has(_, key) {
    return typeof key === "string" && legalEnvName(key) in source();
  },
  ownKeys() {
    return Object.keys(source())
      .filter((k) => k.startsWith("LEGAL_") || PASSTHROUGH.has(k))
      .map((k) => (k.startsWith("LEGAL_") ? k.slice(6) : k));
  },
  getOwnPropertyDescriptor(_, key) {
    if (typeof key !== "string") return undefined;
    const value = source()[legalEnvName(key)];
    return value === undefined ? undefined : { value, enumerable: true, configurable: true, writable: false };
  },
  set() {
    return false;
  },
});

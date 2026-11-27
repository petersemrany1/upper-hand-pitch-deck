// Legal app code reads its settings through this instead of process.env, so
// it only ever sees LEGAL_-prefixed values (TWILIO_AUTH_TOKEN reads
// LEGAL_TWILIO_AUTH_TOKEN). It can never pick up the Hair app's Twilio, Square
// or Stripe keys. Names that already start with LEGAL_ and the portal
// database connection pass through unchanged.
const PASSTHROUGH = new Set(["NODE_ENV", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);

export function legalEnvName(name: string): string {
  return PASSTHROUGH.has(name) || name.startsWith("LEGAL_") ? name : `LEGAL_${name}`;
}

const source = (): Record<string, string | undefined> =>
  typeof process === "undefined" ? {} : (process.env as Record<string, string | undefined>);

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

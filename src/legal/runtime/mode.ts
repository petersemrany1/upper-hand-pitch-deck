// Which database the Legal screens in the portal read from. "legal" is the
// Legal app's own database (today's behaviour, signed in with a Legal login);
// "portal" is the Legal area of this portal's database, where the moved Legal
// engine runs. Pages switch one at a time (see LegalView) until switch-over.
export type LegalDataMode = "legal" | "portal";

let current: LegalDataMode = "legal";

export function setLegalDataMode(mode: LegalDataMode) {
  current = mode;
}

export function legalDataMode(): LegalDataMode {
  return current;
}

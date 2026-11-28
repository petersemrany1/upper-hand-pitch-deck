// boldfamilylaw.com.au is Legal Group's own address (served by this portal
// since the Legal move). Things people see before signing in, the tab title and
// icon use Legal Group branding there.
export function isLegalHost(): boolean {
  return typeof window !== "undefined" && /(^|\.)boldfamilylaw\.com\.au$/.test(window.location.hostname);
}

export const LEGAL_BRAND = { name: "Legal Group Portal", logo: "/media/bold-logo.jpeg", alt: "Legal Group" };

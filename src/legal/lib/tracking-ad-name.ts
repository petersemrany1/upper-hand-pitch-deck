// Ported from the Legal app (family-law-floater/src/lib/tracking-ad-name.ts). Re-run the port script to refresh.
// Confirmed against the video attached to this Meta ad (Amanda 2 .v2.mp4).
export function trackingAdName(adId: string | null | undefined, sourceName: string) {
  return adId === "120248848747080599" ? "My ex controlled every dollar" : sourceName;
}

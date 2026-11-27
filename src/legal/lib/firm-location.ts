// Ported from the Legal app (family-law-floater/src/lib/firm-location.ts). Re-run the port script to refresh.
export type FirmLocationNotes = {
  nearby_landmarks: string | null;
  parking_info: string | null;
};

/** Accept plain lines or pasted bullets without displaying a second bullet. */
export function locationPoints(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^(?:[-*•]\s*|\d+[.)]\s+)/, "")
        .trim(),
    )
    .filter(Boolean);
}

export function locationNotes(text: string): string | null {
  return locationPoints(text).join("\n") || null;
}

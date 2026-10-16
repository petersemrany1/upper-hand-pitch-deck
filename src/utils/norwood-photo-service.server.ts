import { HAIRLINE_PROBE } from "./norwood-hairline-probe.server";
import { requestNorwoodBurstCheck } from "./norwood-burst-check.server";
// A generated 64px grey square, never a patient photo. Exercises the actual
// image + structured response path before the rep sends a test link.
const BLANK = "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAQAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAQABAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQABP/aAAwDAQACEQMRAD8A+0KKKKACiiigAooooAKKKKAP/9D7QooooAKKKKACiiigAooooA//0ftCiiigAooooAKKKKACiiigD//S+0KKKKACiiigAooooAKKKKAP/9k=";
let cached: { model: string; expires: number; result: Promise<void> } | null = null;
export function checkNorwoodPhotoService(apiKey: string, model: string, request: typeof fetch = fetch) {
  if (cached?.model === model && cached.expires > Date.now()) return cached.result;
  // The front burst must select the usable late frame from eight candidates and reject the blanks.
  // The same frontal image must NOT pass as a crown. No patient data is used.
  const result = Promise.all([
    requestNorwoodBurstCheck("front", Array.from({ length: 8 }, (_, index) => index === 6 ? HAIRLINE_PROBE : BLANK), apiKey, request, model),
    requestNorwoodBurstCheck("crown", [HAIRLINE_PROBE], apiKey, request, model),
  ]).then(([front, crown]) => {
    console.info("Norwood fixture check", { front: front.ready, chosen: front.selectedIndex, frontProblem: front.problem, crown: crown.ready, crownProblem: crown.problem });
    if (!front.ready || front.selectedIndex !== 6 || crown.ready) throw new Error("The photo checker did not pass its connection check. Please try again.");
  });
  cached = { model, expires: Date.now() + 300_000, result };
  void result.catch(() => { if (cached?.result === result) cached = null; });
  return result;
}

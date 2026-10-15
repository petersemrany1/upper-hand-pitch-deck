const previewHosts = new Set([
  "localhost", "127.0.0.1",
  "preview--hairtransplantgroup.lovable.app",
  "id-preview--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app",
  "1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovableproject.com",
]);
export function isNorwoodPreviewHost(host: string) { return previewHosts.has(host.toLowerCase()); }
export function assertNorwoodPreviewRequest(url: string, origin: string | null) {
  const request = new URL(url);
  if (!isNorwoodPreviewHost(request.hostname) || !origin || new URL(origin).origin !== request.origin) {
    throw new Error("This test is available only in the Norwood preview.");
  }
}

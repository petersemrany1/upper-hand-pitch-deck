import { isNorwoodPreviewHost } from "./norwood-preview-access";

export function norwoodGuestLanding(location: { hostname: string; hash: string }): string | null {
  if (!isNorwoodPreviewHost(location.hostname)) return null;
  const token = /^#norwood-test=([A-Za-z0-9_-]{43})$/.exec(location.hash)?.[1];
  return token ? `/norwood-photo-test#${token}` : null;
}

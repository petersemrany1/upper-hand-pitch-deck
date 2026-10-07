export function checkoutClinicAddress(clinic: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
} | null): string {
  const address = clinic?.address?.trim() ?? "";
  if (!address) return "";
  // Some records contain the full postal address; others store its parts.
  // Do not append the metro area to an already complete suburb/postcode.
  if (/\b\d{4}\b/.test(address)) return address;
  return [address, clinic?.city?.trim(), clinic?.state?.trim()]
    .filter((part, index) => part && (index === 0 || !address.toLowerCase().includes(part.toLowerCase())))
    .join(", ");
}

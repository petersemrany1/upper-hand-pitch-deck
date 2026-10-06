export function isGroSydney(clinic: { clinic_name: string | null; city: string | null } | null): boolean {
  return !!clinic && /\bgro\b/i.test(clinic.clinic_name ?? "") &&
    /\bsydney\b/i.test(`${clinic.clinic_name ?? ""} ${clinic.city ?? ""}`);
}

export const GRO_SYDNEY_SELLING_POINTS = [
  "A doctor performs your whole procedure — not a technician.",
  "Natural results are GRO's focus. The aim is for nobody to know you've had it done.",
  "15,000 clients and over 50 million hairs transplanted. You're not a guinea pig.",
  "The biggest name in the Southern Hemisphere has a reputation to protect and a name to stand behind.",
];

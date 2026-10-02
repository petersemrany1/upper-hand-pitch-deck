/** Use the recorded name and role without assuming medical qualifications. */
export function consultationMemberLabel(member: { name: string; title?: string | null } | null | undefined): string {
  const name = member?.name.trim() ?? "";
  const title = member?.title?.trim();
  return name && title ? `${name} — ${title}` : name;
}

export type ConsultationRoles = {
  conducts_consultations: boolean;
  performs_procedures: boolean;
};

export function consultationProviders<T extends ConsultationRoles>(members: T[]): T[] {
  return members.filter((member) => member.conducts_consultations);
}

export function treatingSurgeons<T extends ConsultationRoles>(members: T[]): T[] {
  return members.filter((member) => member.performs_procedures);
}

/**
 * Query key factory. Every React Query key in the app is declared here so
 * invalidation is greppable and collision-free.
 *
 * Convention: keys.<domain>.<scope>(...args). Invalidate a whole domain
 * with queryClient.invalidateQueries({ queryKey: keys.leads.all }).
 */
export const keys = {
  leads: {
    all: ["leads"] as const,
    list: (filters?: Record<string, unknown>) => ["leads", "list", filters ?? {}] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
    queue: (repId: string | null) => ["leads", "queue", repId] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: () => ["clients", "list"] as const,
  },
  clinics: {
    all: ["clinics"] as const,
    list: (filters?: Record<string, unknown>) => ["clinics", "list", filters ?? {}] as const,
    detail: (id: string) => ["clinics", "detail", id] as const,
    contacts: (clinicId: string) => ["clinics", "contacts", clinicId] as const,
  },
  partnerClinics: {
    all: ["partner-clinics"] as const,
    list: () => ["partner-clinics", "list"] as const,
    detail: (id: string) => ["partner-clinics", "detail", id] as const,
  },
  appointments: {
    all: ["appointments"] as const,
    list: (filters?: Record<string, unknown>) => ["appointments", "list", filters ?? {}] as const,
    forClinic: (clinicId: string) => ["appointments", "clinic", clinicId] as const,
  },
  calls: {
    all: ["calls"] as const,
    records: (filters?: Record<string, unknown>) => ["calls", "records", filters ?? {}] as const,
    missed: () => ["calls", "missed"] as const,
  },
  sms: {
    all: ["sms"] as const,
    threads: () => ["sms", "threads"] as const,
    messages: (threadId: string) => ["sms", "messages", threadId] as const,
  },
  reps: {
    all: ["reps"] as const,
    list: () => ["reps", "list"] as const,
    performance: (repId: string) => ["reps", "performance", repId] as const,
  },
  errorLogs: {
    all: ["error-logs"] as const,
    list: () => ["error-logs", "list"] as const,
    unresolvedCount: () => ["error-logs", "unresolved-count"] as const,
  },
} as const;

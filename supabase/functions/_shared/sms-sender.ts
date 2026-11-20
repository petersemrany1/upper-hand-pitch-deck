/** Select only a currently active sender; never fall back to a released lease. */
export async function resolveSmsSender(db: any, preferred: string | null = null, mms = false): Promise<string> {
  const { data, error } = await db.rpc('select_sms_sender', { p_preferred: preferred, p_mms: mms });
  if (error) throw new Error(`SMS sender unavailable: ${error.message}`);
  if (typeof data !== 'string' || !/^\+614\d{8}$/.test(data)) throw new Error('No active SMS sender is available');
  return data;
}

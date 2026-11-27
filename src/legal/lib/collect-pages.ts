// Ported from the Legal app (family-law-floater/src/lib/collect-pages.ts). Re-run the port script to refresh.
/** Every reporting/availability read must fail if any page fails. */
export async function collectPages<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  size = 500,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += size) {
    const { data, error } = await read(offset, offset + size - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The database returned no page data");
    result.push(...data);
    if (data.length < size) return result;
  }
}

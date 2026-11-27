// Ported from the Legal app (family-law-floater/src/lib/firm-pack-orders.ts). Re-run the port script to refresh.
import { z } from "zod";

export const packOrderSchema = z.object({
  firmId: z.string().uuid(),
  requestId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

export type PackOrderResult = {
  id: string;
  pack_id: string;
  quantity: number;
  payment_status: "manual_pending";
};

export type PackOrderRpc = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

/** Use the caller's authenticated client: the database checks firm membership. */
export async function placeFirmPackOrder(db: PackOrderRpc, input: z.infer<typeof packOrderSchema>) {
  const data = packOrderSchema.parse(input);
  const result = await db.rpc("order_firm_pack", {
    p_firm: data.firmId,
    p_request: data.requestId,
    p_quantity: data.quantity,
  });
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("Could not confirm your pack. Please try again.");
  return result.data as PackOrderResult;
}

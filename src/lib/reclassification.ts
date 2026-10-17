import { z } from "zod";

export const RECLASSIFICATION_VERSION = "2026-10-17-v1";
export const RECLASSIFICATION_NOTICE = "Your request will be assessed against the qualification criteria in your agreement. Please allow this time for a response.";
export const RECLASSIFICATION_ACKNOWLEDGEMENT = "I understand the 1–2 week review timeframe and that submitting this request does not approve a reclassification, credit or refund. The current classification and pack count remain unchanged unless the request is approved.";
export const reclassificationInput = z.object({
  appointmentId: z.string().uuid(),
  reason: z.string().trim().min(20, "Please explain the criterion and supporting details (at least 20 characters).").max(4000),
  acknowledged: z.literal(true),
});
export type ReclassificationRequest = {
  id: string;
  appointment_id: string;
  created_at: string;
  reason: string;
  status: "pending";
};

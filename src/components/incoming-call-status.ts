import { useTwilioDevice } from "@/hooks/useTwilioDevice";

export const INCOMING_BANNER_HEIGHT = 64;

export function useIncomingBannerActive(): boolean {
  const { status, waitingFrom } = useTwilioDevice();
  return status === "ringing-incoming" || (status === "in-call" && !!waitingFrom);
}
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

export const INCOMING_BANNER_HEIGHT = 64;

export function useIncomingBannerActive(): boolean {
  const { status } = useTwilioDevice();
  return status === "ringing-incoming";
}
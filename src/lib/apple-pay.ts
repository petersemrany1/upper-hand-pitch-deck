// Apple's SDK supplies both ApplePaySession on supported third-party browsers
// and a branded button that does not depend on Safari-only CSS rendering.
const APPLE_PAY_SDK_URL = "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";
let sdkPromise: Promise<void> | null = null;

export function loadApplePaySdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Apple Pay requires a browser"));
  if (window.customElements?.get("apple-pay-button")) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = APPLE_PAY_SDK_URL;
    script.crossOrigin = "anonymous";
    script.async = true;
    const timer = window.setTimeout(() => fail(), 10_000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      sdkPromise = null;
      reject(new Error("Apple Pay could not be loaded"));
    }
    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return sdkPromise;
}

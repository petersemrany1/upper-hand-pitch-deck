// Browser-side loader for the Square Web Payments SDK.
// The application id / location id are fetched at runtime from the
// getSquareConfig server function, so switching sandbox -> production is a
// secrets change plus publish, with no rebuild-time config.

export type SquareBrowserEnvironment = "sandbox" | "production";

type SquarePayments = {
  card: (options?: Record<string, unknown>) => Promise<{
    attach: (selector: string | HTMLElement) => Promise<void>;
    tokenize: () => Promise<{
      status: string;
      token?: string;
      errors?: { message?: string }[];
    }>;
    destroy: () => Promise<void>;
  }>;
};

type SquareSdk = {
  payments: (applicationId: string, locationId: string) => SquarePayments;
};

declare global {
  interface Window {
    Square?: SquareSdk;
  }
}

const SDK_URLS: Record<SquareBrowserEnvironment, string> = {
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
  production: "https://web.squarecdn.com/v1/square.js",
};

let sdkPromise: Promise<SquareSdk> | null = null;

export function loadSquareSdk(environment: SquareBrowserEnvironment): Promise<SquareSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Square SDK can only load in the browser"));
  }
  if (window.Square) return Promise.resolve(window.Square);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<SquareSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URLS[environment];
    script.async = true;
    script.onload = () => {
      if (window.Square) resolve(window.Square);
      else reject(new Error("Square SDK failed to initialise"));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Could not load the secure card form. Please refresh and try again."));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export type { SquarePayments, SquareSdk };

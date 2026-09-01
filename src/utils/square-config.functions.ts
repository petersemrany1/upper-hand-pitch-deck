import { createServerFn } from "@tanstack/react-start";

export type SquareConfig = {
  configured: boolean;
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
};

/**
 * Public, read-only config for the browser card form. The application id and
 * location id are public by design (Square publishes them in every Web
 * Payments integration). The access token never leaves the server, and the
 * payment handler always reads SQUARE_LOCATION_ID server-side rather than
 * trusting anything the client sends back.
 */
export const getSquareConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SquareConfig> => {
    const rawApplicationId = (process.env["SQUARE_APPLICATION_ID"] ?? "").trim();
    const locationId = (process.env["SQUARE_LOCATION_ID"] ?? "").trim();
    const environment =
      process.env["SQUARE_ENVIRONMENT"] === "production" ? "production" : "sandbox";

    // Square's Web Payments SDK requires the sandbox application id to carry the
    // `sandbox-` prefix (e.g. `sandbox-sq0idb-...`). Dashboards often surface the
    // bare id, which makes the SDK throw
    // "The Payment 'applicationId' option is not in the correct format".
    let applicationId = rawApplicationId;
    if (environment === "sandbox" && applicationId.startsWith("sq0idb-")) {
      applicationId = `sandbox-${applicationId}`;
    }
    if (environment === "production" && applicationId.startsWith("sandbox-")) {
      applicationId = applicationId.replace(/^sandbox-/, "");
    }

    return {
      configured: Boolean(applicationId && locationId && process.env["SQUARE_ACCESS_TOKEN"]),
      applicationId,
      locationId,
      environment,
    };
  },
);


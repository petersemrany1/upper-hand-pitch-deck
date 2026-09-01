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
    const applicationId = process.env["SQUARE_APPLICATION_ID"] ?? "";
    const locationId = process.env["SQUARE_LOCATION_ID"] ?? "";
    const environment =
      process.env["SQUARE_ENVIRONMENT"] === "production" ? "production" : "sandbox";

    return {
      configured: Boolean(applicationId && locationId && process.env["SQUARE_ACCESS_TOKEN"]),
      applicationId,
      locationId,
      environment,
    };
  },
);

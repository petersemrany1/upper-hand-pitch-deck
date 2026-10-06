import { describe, expect, test } from "bun:test";
import { isModuleLoadError } from "./module-load-error";

describe("deployment chunk failures", () => {
  test.each([
    "Failed to fetch dynamically imported module: https://example.test/assets/clinic-outcome.functions-old.js",
    "Importing a module script failed.",
    "error loading dynamically imported module: https://example.test/assets/portal.js",
    "Loading chunk 42 failed.",
    "Unable to preload CSS for /assets/portal.css",
  ])("offers a full reload for %s", (message) => {
    expect(isModuleLoadError(new TypeError(message))).toBe(true);
    expect(isModuleLoadError({ message })).toBe(true);
  });

  test.each([new TypeError("Failed to fetch"), new Error("Unauthorized"), null, undefined, "Refund failed"])("does not treat an API error as an outdated module: %s", (error) => {
    expect(isModuleLoadError(error)).toBe(false);
  });
});

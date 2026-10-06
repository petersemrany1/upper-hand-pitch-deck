/** Specific chunk failures only; ordinary API/network errors must not reload a form. */
export function isModuleLoadError(error: unknown): boolean {
  const message = typeof error === "string"
    ? error
    : error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|Unable to preload CSS/i.test(message);
}

export function statusUpdateError(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message) : "";
  if (/no clinic appointment exists/i.test(message)) {
    return "This enquiry has no appointment. Open the original booked enquiry, or complete Book Appointment first.";
  }
  if (error && typeof error === "object" && "code" in error && error.code === "PGRST116") {
    return "This enquiry is no longer available to update. Refresh the lead list and open the current record.";
  }
  return message ? `Couldn't update status: ${message}` : "Couldn't update status. Please try again.";
}

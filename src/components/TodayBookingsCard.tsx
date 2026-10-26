import { Link } from "@tanstack/react-router";
import { CalendarCheck2 } from "lucide-react";
import type { DashboardBooking } from "@/lib/dashboard-bookings";
import { formatSydney } from "@/lib/timezone";

export function TodayBookingsCard({ bookings, error, onRetry }: {
  bookings: DashboardBooking[] | null;
  error: boolean;
  onRetry: () => void;
}) {
  return <section aria-labelledby="today-bookings-title" className="dashboard-overview-card">
    <div className="dashboard-card-heading">
      <div className="dashboard-heading-with-icon"><span className="dashboard-small-icon"><CalendarCheck2 size={17} /></span><div><h2 id="today-bookings-title">Booked today</h2><p>New bookings, with the source that brought them in.</p></div></div>
      {bookings && <span className="dashboard-count-badge">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</span>}
    </div>
    {error && <p role="status" className="dashboard-bookings-notice">{bookings ? "Could not refresh. Showing the last loaded bookings." : "Today's bookings could not be loaded."} <button onClick={onRetry}>Retry</button></p>}
    {!bookings && !error && <p role="status" className="dashboard-bookings-notice">Loading today's bookings…</p>}
    {bookings?.length === 0 && <div className="dashboard-empty"><CalendarCheck2 size={24} /><p>No bookings made today yet.</p><span>Your next booking will appear here.</span></div>}
    {!!bookings?.length && <div className="dashboard-bookings-table">
      <table aria-label="Bookings made today"><thead><tr>{["Patient", "City", "Source", "Booked"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
        {bookings.map(booking => <tr key={booking.id}>
          <td>{booking.leadId ? <Link to="/sales-call" search={{ leadId: booking.leadId } as never}>{booking.name}</Link> : booking.name}</td>
          <td>{booking.city}{booking.cityFromClinic && <small>Clinic city</small>}</td>
          <td style={{maxWidth:350,overflowWrap:"anywhere"}}>{booking.source || "Not recorded"}{booking.campaign && <small>Campaign: {booking.campaign}</small>}</td>
          <td>{booking.bookedAt ? formatSydney(booking.bookedAt, {hour:"numeric",minute:"2-digit"}) : "—"}</td>
        </tr>)}
      </tbody></table>
    </div>}
  </section>;
}

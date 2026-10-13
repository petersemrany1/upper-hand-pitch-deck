import { Link } from "@tanstack/react-router";
import type { DashboardBooking } from "@/lib/dashboard-bookings";
import { formatSydney } from "@/lib/timezone";

export function TodayBookingsCard({ bookings, error, onRetry }: {
  bookings: DashboardBooking[] | null;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <section aria-labelledby="today-bookings-title" style={{ background: "#fff", border: "0.5px solid #e8e8e6", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "0.5px solid #f0f0ee" }}>
        <div>
          <h2 id="today-bookings-title" style={{ fontSize: 15, fontWeight: 600, color: "#111", margin: 0 }}>Booked today</h2>
          <p style={{ fontSize: 12, color: "#777", margin: "3px 0 0" }}>Bookings made today · Sydney time</p>
        </div>
        {bookings && <span style={{ fontSize: 12, color: "#777", whiteSpace: "nowrap" }}>{bookings.length} booking{bookings.length === 1 ? "" : "s"}</span>}
      </div>
      {error && <p role="status" style={{ padding: "12px 20px", fontSize: 13, color: "#9a6700", margin: 0 }}>
        {bookings ? "Could not refresh. Showing the last loaded bookings." : "Today's bookings could not be loaded."}
        {" "}<button onClick={onRetry} style={{ textDecoration: "underline" }}>Retry</button>
      </p>}
      {!bookings && !error && <p role="status" style={{ padding: 20, fontSize: 13, color: "#777", margin: 0 }}>Loading today's bookings…</p>}
      {bookings?.length === 0 && <p style={{ padding: 20, fontSize: 13, color: "#777", margin: 0 }}>No bookings made today yet.</p>}
      {!!bookings?.length && <div style={{ overflowX: "auto" }}>
        <table aria-label="Bookings made today" style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "#fafaf9", fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <tr>{["Patient", "City", "Source ad", "Booked"].map(label => <th key={label} scope="col" style={{ padding: "10px 20px", fontWeight: 500 }}>{label}</th>)}</tr>
          </thead>
          <tbody>{bookings.map(booking => <tr key={booking.id} style={{ borderTop: "0.5px solid #f0f0ee", fontSize: 13, color: "#111", verticalAlign: "top" }}>
            <td style={{ padding: "14px 20px", fontWeight: 600 }}>
              {booking.leadId ? <Link to="/sales-call" search={{ leadId: booking.leadId } as never} style={{ color: "#111", textDecoration: "underline", textUnderlineOffset: 3 }}>{booking.name}</Link> : booking.name}
            </td>
            <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
              {booking.city}
              {booking.cityFromClinic && <div style={{ fontSize: 11, color: "#777", marginTop: 3 }}>Clinic city</div>}
            </td>
            <td style={{ padding: "14px 20px", maxWidth: 350, overflowWrap: "anywhere" }}>
              <div style={{ color: booking.ad ? "#111" : "#777" }}>{booking.ad || "Not recorded"}</div>
              {booking.campaign && <div style={{ fontSize: 11, color: "#777", marginTop: 3 }}>Campaign: {booking.campaign}</div>}
            </td>
            <td style={{ padding: "14px 20px", color: "#777", whiteSpace: "nowrap" }}>{booking.bookedAt ? formatSydney(booking.bookedAt, { hour: "numeric", minute: "2-digit" }) : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  );
}

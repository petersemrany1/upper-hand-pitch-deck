# Roadmap

- [x] Add 3rd conversion metric: Convos → Sales (2min+ calls → bookings), rep + admin dashboards
- [x] Add "Past 30 days" and "Past 60 days" period filters to conversion widget
- [x] Verify build/typecheck clean

## Square checkout (Sep 3)
- [x] Big "REFUNDABLE BOOKING FEE" heading on /squarepayment
- [x] Google Pay: skip wallets inside cross-origin iframes (fixes "something went wrong")
- [x] No blank scroll space below the card (hard viewport lock)
- [x] Apple Pay: hairtransplantgroup.lovable.app registered with Square (VERIFIED); button only renders in Safari on Apple devices

- [x] Checkout: remove the Chrome QR handoff; Apple Pay appears only when Square confirms native support.
- [x] Checkout: use a fixed small-viewport canvas so mobile browser toolbar changes cannot shift or scroll the first render.
- [x] Checkout: reserve the final Square form footprint from first paint and top-anchor compact phone layouts so async fields cannot re-centre or clip the page.
- [x] Checkout: start the Square SDK download alongside booking/config reads and reserve clinic-detail height to prevent late first-load shifts.
- [x] Checkout: top-anchor every phone height and support safe-area insets so mobile browser toolbar changes cannot reposition the form.
- [x] Checkout: size the fixed canvas from the initial visual viewport and allow the complete clinic/card fields to render without clipping.
- [x] Checkout: remove vertical re-centring and reserve the final Square iframe height so first load and loaded layout stay fixed.

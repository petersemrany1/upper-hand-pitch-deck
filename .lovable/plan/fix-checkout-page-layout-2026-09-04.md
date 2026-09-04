Fix checkout page layout

1. Update `src/styles.css` square-checkout rules
   - Replace `.square-checkout-viewport` with:
     ```css
     .square-checkout-viewport {
       min-height: 100svh;
       width: 100%;
       -webkit-text-size-adjust: 100%;
       text-size-adjust: 100%;
     }
     ```
   - Replace `.square-checkout-main` with:
     ```css
     .square-checkout-main {
       padding-top: max(16px, env(safe-area-inset-top));
       padding-bottom: max(28px, env(safe-area-inset-bottom));
     }
     ```
   - Replace `.square-checkout-merchant` with:
     ```css
     .square-checkout-merchant {
       min-height: 0;
     }
     ```
   - Delete the `@media (max-height: 720px)` block entirely.
   - Delete the `@media (max-height: 620px)` block entirely.
   - Leave `.square-loading-block`, `.square-loading-card` and `@keyframes square-checkout-loading` unchanged.

2. Update `src/routes/squarepayment.tsx`
   - Remove the `logoAsset` import.
   - Remove the `{/* Square wordmark */}` div that renders the logo.
   - On the merchant div: remove `min-h-11` and change `mt-3` to `mt-1`.
   - On the clinic address paragraph: replace `truncate` with `break-words`.

No other files or logic will be changed. `SquareCardForm.tsx` and payment logic are untouched.

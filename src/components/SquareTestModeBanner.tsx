export function SquareTestModeBanner({ environment }: { environment?: string }) {
  if (environment === "sandbox") {
    return (
      <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-[12px] leading-snug text-orange-900">
        <span className="font-semibold">Test mode.</span> Real cards are rejected here. Use test card{" "}
        <span className="font-mono font-semibold">4111 1111 1111 1111</span>, any future expiry, CVV{" "}
        <span className="font-mono font-semibold">111</span>.
      </div>
    );
  }
  return null;
}

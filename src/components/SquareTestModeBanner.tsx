export function SquareTestModeBanner({ environment }: { environment?: string }) {
  if (environment === "sandbox") {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
        All payments made in the preview are in test mode.
      </div>
    );
  }
  return null;
}

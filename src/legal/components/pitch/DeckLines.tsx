// Ported from the Legal app (family-law-floater/src/components/pitch/DeckLines.tsx). Re-run the port script to refresh.
/**
 * Decorative flowing line pattern used behind deck slides.
 * Purely presentational — hidden from assistive tech.
 */
export function DeckLines({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
    >
      <svg
        className="absolute -right-[10%] -top-[15%] h-[130%] w-[85%] opacity-[0.55]"
        viewBox="0 0 800 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="deck-line-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.06" />
            <stop offset="45%" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent-magenta)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {Array.from({ length: 16 }).map((_, i) => (
          <path
            key={i}
            d={`M ${-160 + i * 26} 820 C ${120 + i * 26} ${560 - i * 12}, ${360 + i * 18} ${420 - i * 16}, ${820} ${140 - i * 22}`}
            stroke="url(#deck-line-grad)"
            strokeWidth="1"
            fill="none"
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
    </div>
  );
}

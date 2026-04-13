export default function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const textClass = size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className={`${textClass} font-black tracking-wider`} style={{ fontFamily: "var(--font-display)" }}>
      <span className="text-foreground">UPPER</span>
      <span className="text-primary">HAND</span>
    </span>
  );
}

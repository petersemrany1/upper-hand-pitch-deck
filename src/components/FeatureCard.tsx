interface FeatureCardProps {
  title: string;
  description: string;
  variant?: "blue" | "dark";
}

export default function FeatureCard({ title, description, variant = "dark" }: FeatureCardProps) {
  const isBlue = variant === "blue";
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        isBlue
          ? "bg-primary border-primary"
          : "bg-card border-border"
      }`}
    >
      <h3 className="text-sm font-bold text-foreground leading-snug">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

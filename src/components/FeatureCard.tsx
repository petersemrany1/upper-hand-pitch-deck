interface FeatureCardProps {
  title: string;
  description: string;
  variant?: "blue" | "dark";
}

export default function FeatureCard({ title, description, variant = "dark" }: FeatureCardProps) {
  const bg = variant === "blue" ? "bg-primary" : "bg-card";
  const border = variant === "blue" ? "border-primary" : "border-border";
  return (
    <div className={`${bg} ${border} border rounded-lg p-6 md:p-8`}>
      <h3 className="text-lg md:text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

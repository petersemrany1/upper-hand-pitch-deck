export default function SlideHeader() {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 24,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: "-0.02em",
        textTransform: "uppercase" as const,
        lineHeight: 1,
      }}
    >
      <span style={{ color: "#FFFFFF" }}>UPPER</span>
      <span style={{ color: "#2D6BE4" }}>HAND</span>
    </div>
  );
}
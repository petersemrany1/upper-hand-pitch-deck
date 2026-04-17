export default function SlideHeader() {
  return (
    <div
      className="absolute top-5 left-16 md:left-6 z-50 flex items-center"
      style={{
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: "-0.02em",
        textTransform: "uppercase",
        lineHeight: 1,
      }}
    >
      <span style={{ color: "#FFFFFF" }}>UPPER</span>
      <span style={{ color: "#2D6BE4" }}>HAND</span>
    </div>
  );
}

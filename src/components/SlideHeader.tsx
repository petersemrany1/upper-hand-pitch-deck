import boldLogo from "@/assets/bold-logo.png";

export default function SlideHeader() {
  return (
    <div
      className="absolute top-5 left-16 md:left-6 z-50 flex items-center gap-2"
    >
      <img
        src={boldLogo}
        alt="bold"
        style={{ height: 22, width: 22, borderRadius: "9999px", display: "block" }}
      />
      <span
        style={{
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: "#FFFFFF",
        }}
      >
        bold
      </span>
    </div>
  );
}

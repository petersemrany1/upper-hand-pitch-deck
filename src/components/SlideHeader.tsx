import boldLogo from "@/assets/bold-logo.png";

export default function SlideHeader() {
  return (
    <div
      className="absolute top-5 left-16 md:left-6 z-50 flex items-center gap-2"
    >
      <img
        src={boldLogo}
        alt="bold"
        style={{ height: 30, width: 30, borderRadius: "9999px", display: "block" }}
      />
    </div>
  );
}

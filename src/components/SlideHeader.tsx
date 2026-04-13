import Logo from "./Logo";

export default function SlideHeader() {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-5 md:px-12">
      <Logo />
      <span className="text-xs text-muted-foreground tracking-wide hidden sm:block">Confidential, do not distribute</span>
    </div>
  );
}

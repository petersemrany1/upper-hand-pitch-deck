export default function SlideHeader() {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-8 py-6 md:px-12">
      <span className="text-[11px] text-muted-foreground tracking-wide hidden sm:block">
        Confidential, do not distribute
      </span>
    </div>
  );
}
